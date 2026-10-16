import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }

        const user = await User.findById(decoded.userId).select('name email companyId isVerified');
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        req.userId = user._id;
        req.user = user;
        next();
    } catch (error) {
        console.log("Error token invalid", error);
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};
