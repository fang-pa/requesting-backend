const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth')
const Form = require("../models/FormRequest")

router.get('/auth', auth, (req, res) => {
    res.json(req.user);
});

router.get('/home', auth, async (req, res) => {
    try {
        if (req.user.role === 'Admin') {
            res.status(200).json(await Form.find({ docStatus: true }))
        } else if (req.user.role === 'Student') {
            res.status(200).json(await Form.find({
                $and: [
                    { 'studentInfo': req.user._id },
                    { docStatus: true }]
            }))
        } else if (req.user.role === 'Teacher') {
            res.status(200).json(await Form.find({
                'requireInfo.sub_teach': {
                    $elemMatch: {
                        teacher: req.user._id,
                        'tStatus.Approved': 'unknown',
                        'tStatus.AcessDoc': true
                    }
                },
                docStatus: true
            }))
        } else if (req.user.role === 'Officer') {
            res.status(200).json(await Form.find({
                $and: [
                    { 'reqStatus.office.Approved': 'unknown' },
                    { 'reqStatus.office.AcessDoc': true },
                    { docStatus: true }
                ]
            }))
        } else if (req.user.role === 'Registrar') {
            res.status(200).json(await Form.find({
                $and: [
                    { 'reqStatus.regis.Approved': 'unknown' },
                    { 'reqStatus.regis.AcessDoc': true },
                    { docStatus: true }
                ]
            }))
        } else if (req.user.role === 'DirectorOfRegistration') {
            res.status(200).json(await Form.find({
                $and: [
                    { 'reqStatus.sign.Approved': 'unknown' },
                    { 'reqStatus.sign.AcessDoc': true },
                    { docStatus: true }
                ]
            }))
        }
    } catch (err) {
        console.log(err);
    }
})


router.get('/history', auth, async (req, res) => {
    try {
        if (req.user.role === 'Admin') {
            res.status(200).json(await Form.find({ docStatus: false }).sort({ dateTime: -1 }))
        } else if (req.user.role === 'Student') {
            res.status(200).json(await Form.find({
                $and: [
                    { studentInfo: req.user._id },
                    { docStatus: false }]
            }).sort({ dateTime: -1 }))
        } else if (req.user.role === 'Teacher') {
            res.status(200).json(await Form.find({
                'requireInfo.sub_teach': {
                    $elemMatch: {
                        'tStatus.Approved': { $ne: 'unknown' },
                        teacher: req.user._id,
                        'tStatus.AcessDoc': false
                    }
                },
            }).sort({ dateTime: -1 }))
        } else if (req.user.role === 'Officer') {
            res.status(200).json(await Form.find({
                $or: [
                    {
                        $and: [
                            { 'reqStatus.office.Approved': { $ne: 'unknown' } },
                            { 'reqStatus.office.AcessDoc': false },
                        ]
                    }, {
                        $and: [
                            { 'reqStatus.office.C_Approved': { $ne: 'unknown' } },
                            { 'reqStatus.office.AcessDoc': false },
                        ]
                    }
                ]
            }).sort({ dateTime: -1 }))
        } else if (req.user.role === 'Registrar') {
            res.status(200).json(await Form.find({
                $and: [
                    { 'reqStatus.regis.Approved': { $ne: 'unknown' } },
                    { 'reqStatus.regis.AcessDoc': false },
                ]
            }).sort({ dateTime: -1 }))
        } else if (req.user.role === 'DirectorOfRegistration') {
            res.status(200).json(await Form.find({
                $and: [
                    { 'reqStatus.sign.Approved': { $ne: 'unknown' } },
                    { 'reqStatus.sign.AcessDoc': false },
                ]
            }).sort({ dateTime: -1 }))
        }
    } catch (err) {
        console.log(err);
    }
})

module.exports = router;