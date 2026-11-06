import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import DomainClaim from '../models/domainClaim.js';
import Company from '../models/company.js';
import { makeDomainVerificationToken, normalizeDomainInput, getDomainVerificationText } from '../utils/domainUtils.js';

const PENDING_CLAIM_LIFETIME_MS = 1000 * 60 * 60 * 24;

async function cleanupExpiredClaims(normalizedDomain) {
  if (!normalizedDomain) return;

  await DomainClaim.deleteMany({
    normalizedDomain,
    verificationStatus: 'pending',
    expiresAt: { $lt: new Date() },
  });
}

async function ensureUniquePendingClaim(workspaceId, normalizedDomain) {
  const existing = await DomainClaim.findOne({ normalizedDomain }).lean();
  if (!existing) return null;

  if (String(existing.workspaceId) === String(workspaceId)) {
    if (existing.verificationStatus === 'verified') {
      return existing;
    }
    if (existing.expiresAt && existing.expiresAt > new Date()) {
      return existing;
    }
    await DomainClaim.deleteOne({ _id: existing._id });
    return null;
  }

  if (existing.verificationStatus === 'verified') {
    return { conflict: true, claim: existing };
  }

  if (existing.expiresAt && existing.expiresAt > new Date()) {
    return { conflict: true, claim: existing };
  }

  await DomainClaim.deleteOne({ _id: existing._id });
  return null;
}

async function verifyDnsToken(domain, token) {
  const hostname = `_nudge-domain-verification.${domain}`;
  const records = await dns.resolveTxt(hostname).catch(() => []);
  const flattened = records.flat().map((entry) => String(entry).trim());
  return flattened.some((value) => value === token || value === getDomainVerificationText(token));
}

async function verifyWebToken(domain, token) {
  const candidates = [
    `https://${domain}/.well-known/nudge-domain-verification.txt`,
    `https://${domain}/nudge-domain-verification.txt`,
    `https://${domain}/nudge-domain-verification.html`,
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const text = await response.text();
      if (text.includes(token) || text.includes(getDomainVerificationText(token))) {
        return true;
      }
      const metaMatch = text.match(/<meta[^>]+name=["']nudge-domain-verification["'][^>]+content=["']([^"']+)["'][^>]*>/i);
      if (metaMatch && metaMatch[1] === token) {
        return true;
      }
    } catch {
      // Try the next candidate silently.
    }
  }

  try {
    const response = await fetch(`https://${domain}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const html = await response.text();
    const metaMatch = html.match(/<meta[^>]+name=["']nudge-domain-verification["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    return Boolean(metaMatch && metaMatch[1] === token);
  } catch {
    return false;
  }
}

export const registerDomain = async (req, res) => {
  try {
    if (!req.user?.companyId) {
      return res.status(409).json({ code: 'WORKSPACE_REQUIRED', message: 'Set up a workspace before registering a domain.' });
    }

    const normalizedDomain = normalizeDomainInput(req.body?.domain);
    if (!normalizedDomain) {
      return res.status(400).json({ code: 'INVALID_DOMAIN', message: 'Enter a valid website domain.' });
    }

    await cleanupExpiredClaims(normalizedDomain);
    const existing = await ensureUniquePendingClaim(req.user.companyId, normalizedDomain);
    if (existing && existing.conflict) {
      return res.status(409).json({
        code: 'DOMAIN_ALREADY_REGISTERED',
        message: `${normalizedDomain} is already claimed by another workspace.`,
      });
    }

    if (existing && !existing.conflict) {
      return res.status(200).json({
        domain: existing,
        verification: {
          dns: `_nudge-domain-verification.${normalizedDomain}`,
          value: existing.verificationToken,
          webPaths: [
            `https://${normalizedDomain}/.well-known/nudge-domain-verification.txt`,
            `https://${normalizedDomain}/nudge-domain-verification.txt`,
          ],
        },
      });
    }

    const token = makeDomainVerificationToken();
    const claim = await DomainClaim.create({
      workspaceId: req.user.companyId,
      normalizedDomain,
      verificationStatus: 'pending',
      verificationToken: token,
      expiresAt: new Date(Date.now() + PENDING_CLAIM_LIFETIME_MS),
    });

    return res.status(201).json({
      domain: claim,
      verification: {
        dns: `_nudge-domain-verification.${normalizedDomain}`,
        value: token,
        webPaths: [
          `https://${normalizedDomain}/.well-known/nudge-domain-verification.txt`,
          `https://${normalizedDomain}/nudge-domain-verification.txt`,
        ],
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ code: 'DOMAIN_ALREADY_REGISTERED', message: 'This domain is already registered to another workspace.' });
    }
    console.error('Failed to register domain:', error);
    return res.status(500).json({ code: 'DOMAIN_REGISTRATION_FAILED', message: 'Could not register this domain.' });
  }
};

export const listRegisteredDomains = async (req, res) => {
  try {
    const claims = await DomainClaim.find({ workspaceId: req.user.companyId })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ domains: claims });
  } catch (error) {
    console.error('Failed to list domains:', error);
    return res.status(500).json({ code: 'DOMAINS_LOOKUP_FAILED', message: 'Could not load registered domains.' });
  }
};

export const verifyDomain = async (req, res) => {
  try {
    const claim = await DomainClaim.findOne({
      _id: req.params.id,
      workspaceId: req.user.companyId,
    });

    if (!claim) {
      return res.status(404).json({ code: 'DOMAIN_NOT_FOUND', message: 'Domain claim not found.' });
    }

    const chosenMethod = String(req.body?.method || 'dns').toLowerCase();
    const allowed = ['dns', 'meta', 'file'];
    if (!allowed.includes(chosenMethod)) {
      return res.status(400).json({ code: 'INVALID_VERIFICATION_METHOD', message: 'Verification method must be dns, meta, or file.' });
    }

    let verified = false;
    if (chosenMethod === 'dns') {
      verified = await verifyDnsToken(claim.normalizedDomain, claim.verificationToken);
    } else {
      // 'meta' and 'file' both use the same HTTPS fetch check.
      verified = await verifyWebToken(claim.normalizedDomain, claim.verificationToken);
    }

    if (!verified) {
      return res.status(400).json({ code: 'VERIFICATION_FAILED', message: 'We could not verify ownership for this domain yet.' });
    }

    claim.verificationStatus = 'verified';
    claim.verificationMethod = chosenMethod;
    claim.verifiedAt = new Date();
    claim.expiresAt = null;
    await claim.save();

    await Company.updateOne(
      { _id: req.user.companyId },
      { $addToSet: { allowedDomains: claim.normalizedDomain } }
    );

    return res.status(200).json({ success: true, domain: claim });
  } catch (error) {
    console.error('Failed to verify domain:', error);
    return res.status(500).json({ code: 'DOMAIN_VERIFICATION_FAILED', message: 'Could not verify this domain right now.' });
  }
};
