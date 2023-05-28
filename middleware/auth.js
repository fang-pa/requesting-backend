const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const token = req.headers['x-access-token']; 

    if (!token) {
        return res.status(403).json({msg:"A Token Is Required For Authentication"});
    }
    try {
        const decoded = jwt.verify(token,""+process.env.JWT_KEY);
        req.user = decoded;
    } catch(err) {
        return res.status(401).json({ msg:"Invalid Token"});
    }
    return next();
}
module.exports = verifyToken;