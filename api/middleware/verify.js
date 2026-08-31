import jwt from "jsonwebtoken";

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

        req.userId = decoded.userId;
        req.user = { id: decoded.userId };
        next();
    } catch (error) {
        console.log("Error token invalid", error);
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};
