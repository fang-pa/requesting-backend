const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Users = require('../models/Users')
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Role = require('../models/Role');

require('dotenv').config()

router.post('/login', async (req, res) => {
    try {
        const { userID, password } = req.body
        const user = await Users.findOne({ userID })
        if (user && (await bcrypt.compare(password, user.password))) {
            if (user.role.role == 'Student') {
                user.token = jwt.sign(
                    { _id: user._id, userID: userID, name: user.name, surname: user.surName, role: user.role.role, major: user.major._id, dateTime: new Date(Date.now()), classOf: user.classOf },
                    "" + process.env.JWT_KEY,
                    {
                        expiresIn: "5h"
                    }
                )
                
                return res.status(200).json(user)
            }else {
                user.token = jwt.sign(
                    { _id: user._id, userID: userID, name: user.name, surname: user.surName, role: user.role.role},
                    "" + process.env.JWT_KEY,
                    {
                        expiresIn: "5h"
                    }
                )
                return res.status(200).json(user)
            }
        } else {
            return res.status(401).json({ msg: 'ไม่มีชื่อผู้ใช้นี้ หรือ รหัสผ่านไม่ถูกต้อง' })
        }
    } catch (err) {
        console.log(err);
    }
});

router.post('/regis', async (req, res) => {
    try {
        const user = req.body

        //!หาผู้ใช้ซ้ำ
        if (await Users.findOne({ userID: user.userID })) {
            return res.status(409).json({ msg: 'ชื่อผู้ใช้ซ้ำ' })
        }
        //เข้ารหัส password
        user.password = await bcrypt.hash(user.password, 10)
        //insert to database
        res.status(200).json(await Users.create(user))
    } catch (err) {
        console.log(err)
    }
})

router.get("/employee", async (req, res) => {
    try {
        const {_id} = await Role.findOne({role:'Student'});
        res.status(200).json(await Users.find({ role: { $ne: _id.toString() } }))
    } catch (err) {
        console.log(err);
    }
});

router.get("/employee/:id", async (req, res) => {
    try {
        res.json(await Users.findById(req.params.id))
    } catch (err) {
        console.log(err);
    }
});

router.delete("/delete-employee/:id", async (req, res) => {
    try {
        const removedEmployee = await Users.findByIdAndDelete(req.params.id)
        res.status(200).json(removedEmployee)
    } catch (err) {
        console.log(err);
    }
})

router.put("/update-user/:id", async (req, res) => {
    try {
        const user = req.body
        if (user.sign) {
            await Users.findByIdAndUpdate(req.params.id, { sign: user.sign })
        }
        if (user.lineToken.token) {
            await Users.findByIdAndUpdate(req.params.id, { 'lineToken.token': user.lineToken.token, 'lineToken.thereIs': true })
        }
        return res.status(200)
    } catch (err) {
        console.log(err);
    }
})

router.put("/update-employee/:id", async (req, res) => {
    try {
        const user = req.body
            const updatedUser = await Users.findByIdAndUpdate(req.params.id, user)
            if (!updatedUser) {
                return res.status(409).json({ msg: "บันทึกไม่สำเร็จ" });
            }
            return res.status(200).json(updatedUser)
        
    } catch (err) {
        console.log(err);
    }
})

router.get("/teacher", async (req, res) => {
    try {
        res.json(await Users.find({ role: '62ed35de4de962dfd7250b82' }))
    } catch (err) {
        console.log(err);
    }
});

router.get("/profile", auth, async (req, res) => {
    try {
        res.json(await Users.findById({ _id: req.user._id }))
    } catch (err) {
        console.log(err);
    }
})
module.exports = router;