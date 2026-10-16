import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import User from '../models/user.js'
import Company from '../models/company.js'
import { generateToken } from '../utils/setCookie.js'
import { sendEmail } from '../utils/sendEmail.js'
import { EmailVerification, WelcomeEmail, ResetPassword, ResetPasswordSuccess } from '../templates/email.js'

async function ensureWorkspace(user) {
    let company = await Company.findOne({ ownerUserId: user._id })
    if (!company) {
        company = await Company.create({
            name: user.name || 'My workspace',
            ownerUserId: user._id,
            widgetPublicKey: crypto.randomBytes(24).toString('hex'),
            onboardingCompleted: false,
        })
    }
    if (!user.companyId || String(user.companyId) !== String(company._id)) {
        user.companyId = company._id
        await user.save()
    }
    return company
}

export const signup = async (req, res) => {
    const { email, password, name } = req.body;

    try {

        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        const userAlreadyExists = await User.findOne({ email });
        if (userAlreadyExists) {
            return res.status(400).json({ message: 'User already exists' });
        }


        const verificationToken = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const user = new User({
            email,
            password,
            name,
            verificationToken,
            verificationTokenExpire: new Date(Date.now() + 3600000),
        });


        await user.save();
        try {
            await ensureWorkspace(user)
        } catch (provisionError) {
            await Company.deleteOne({ ownerUserId: user._id })
            await User.deleteOne({ _id: user._id })
            throw provisionError
        }
        const token = generateToken(res, user._id);


        try {
            await sendEmail({
                to: user.email,
                subject: 'Verify your email',
                html: EmailVerification(verificationToken)
            });
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
        }


        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            token,
            user: { ...user._doc, password: undefined },
        });

    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};
//verify email logic
export const verifyEmail = async (req, res) => {
    try {
        let { code } = req.body;
        code = String(code || '').trim();

        const user = await User.findOne({
            verificationToken: code,
            verificationTokenExpire: { $gt: Date.now() },
        });

        if (!user) {
            console.log('verifyEmail: no matching user for code', code);
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code',
            });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;
        await user.save();

        const appUrl = process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'
        const pricingUrl = new URL('/pricing', appUrl).toString()
        await sendEmail({
            to: user.email,
            subject: 'Welcome',
            html: WelcomeEmail(user.name, user.email, pricingUrl)
        });

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            user: { ...user._doc, password: undefined },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const resendVerification = async (req, res) => {
    try {
        console.log('resendVerification called', { userId: req.userId });
        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email already verified' })
        }

        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString()
        user.verificationToken = verificationToken
        user.verificationTokenExpire = new Date(Date.now() + 3600000)
        await user.save()

        await sendEmail({
            to: user.email,
            subject: 'Verify your email',
            html: EmailVerification(verificationToken)
        });

        return res.status(200).json({
            success: true,
            message: 'Verification email resent successfully',
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
};
//logout
export const logout = (req, res) => {
    res.clearCookie('token')

    res.status(200).json({ success: true, message: 'Logged out successfully' });
}

//login logic 
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const token = generateToken(res, user._id)
        user.lastlogin = new Date();
        await user.save();
        return res.status(201).json({
            success: true,
            message: 'Logged in successfully',
            token,
            user: { ...user._doc, password: undefined },
        });
    } catch (error) {
        console.error('Login error:', {
            message: error?.message,
            stack: error?.stack,
            env: {
                JWT_SECRET_SET: !!process.env.JWT_SECRET,
                NODE_ENV: process.env.NODE_ENV,
            },
        })

        return res.status(500).json({ message: error?.message || 'Internal Server Error' });
    }
}
//forgot password logic 
export const forgotPassword = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    try {
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists for this email, a reset link will be sent.',
            });
        }
        const token = crypto.randomBytes(20).toString('hex');
        const resetTokenExpires = Date.now() + 3600000;
        user.resetPasswordToken = token;
        user.resetPasswordExpire = resetTokenExpires;
        await user.save();
        const appUrl = process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
        const resetUrl = new URL('/reset-password', appUrl);
        resetUrl.searchParams.set('token', token);
        await sendEmail({
            to: user.email,
            subject: 'Reset your password',
            html: ResetPassword(user.name, user.email, resetUrl.toString())
        });
        return res.status(200).json({
            success: true,
            message: 'If an account exists for this email, a reset link will be sent.',
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
//reset password logic 
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ success: false, message: 'A reset token and password of at least 8 characters are required' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        const appUrl = process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
        const loginUrl = new URL('/login', appUrl).toString();
        await sendEmail({
            to: user.email,
            subject: 'Password reset successful',
            html: ResetPasswordSuccess(user.name, user.email, loginUrl)
        });
        res.status(200).json({ success: true, message: 'Password reset successful' });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }

}
//check auth 
export const checkauth = async (req, res) => {
    try {
        const user = await User.findById(req.userId)

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })

        }
        res.status(200).json({ success: true, user })

    } catch (error) {
        console.log("Error in checking authentication ")

        return res.status(500).json({ success: false, message: error.message })
    }

}
// google auth 
export const googleAuth = async (req, res) => {
    try {
        const { email, name, uid, photoURL } = req.body

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' })
        }

        let user = await User.findOne({ email })

        if (!user) {
            // Create new user if doesn't exist
            user = new User({
                email,
                name: name || 'User',
                googleId: uid,
                profilePicture: photoURL,
                isVerified: true, // Google users are pre-verified
                password: undefined,
            })
            await user.save()
        } else {
            // Update existing user with Google ID if not already set
            if (!user.googleId) {
                user.googleId = uid
            }
            user.lastlogin = new Date()
            await user.save()
        }
        await ensureWorkspace(user)

        const token = generateToken(res, user._id)

        return res.status(200).json({
            success: true,
            message: 'Google authentication successful',
            token,
            user: { ...user._doc, password: undefined },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// update profile
export const updateProfile = async (req, res) => {
    try {
        const { name, email, currentPassword, newPassword, profilePicture } = req.body
        const userId = req.userId

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        // Update name if provided
        if (name && name.trim()) {
            user.name = name.trim()
        }

        // Update email if provided and not already taken
        if (email && email.trim()) {
            const existingUser = await User.findOne({ email: email.trim(), _id: { $ne: userId } })
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already in use' })
            }
            user.email = email.trim()
        }

        // Update password if provided (requires current password)
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ success: false, message: 'Current password is required' })
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password)
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' })
            }
            user.password = await bcrypt.hash(newPassword, 10)
        }

        // Update profile picture if provided
        if (profilePicture) {
            user.profilePicture = profilePicture
        }

        await user.save()

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: { ...user._doc, password: undefined },
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// delete account
export const deleteAccount = async (req, res) => {
    try {
        const userId = req.userId
        const { password } = req.body

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' })
        }


        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required to delete account' })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Password is incorrect' })
        }

        await User.findByIdAndDelete(userId)
        res.clearCookie('token')

        return res.status(200).json({ success: true, message: 'Account deleted successfully' })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}
