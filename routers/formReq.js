const express = require("express");
const axios = require("axios");
const queryString = require('query-string');
const router = express.Router();
const Form = require("../models/FormRequest")
const auth = require('../middleware/auth');
const Users = require("../models/Users");
const Course = require("../models/Course")

// Setup
let date = Date.now()
let count = 0
//

router.post('/req', auth, async (req, res) => {
    try {
        const form = req.body
        const { term, startTerm, endTerm } = await Course.findOne({ $and: [{ startTerm: { $lte: req.user.dateTime } }, { endTerm: { $gte: req.user.dateTime } }] })
        const { joined } = await Users.findById(req.user._id)
        const year = new Date().getFullYear();
        form.requireInfo.gradeYear = year - joined.getFullYear()
        if (form.titleID == "I") {
            res.status(200).json(await Form.create(form))
        } else if (form.titleID == "W") {
            const dub = await Form.countDocuments({ $and: [{ 'requireInfo.term': term }, { 'studentInfo._id': req.user._id }, { titleID: "W" }] })
            if (new Date(req.user.dateTime) >= new Date(endTerm.setDate(endTerm.getDate() - 14))) {
                return res.status(401).json({ msg: "เลยเวลาที่กำหนด" })
            } else if (dub == 1) {
                return res.status(401).json({ msg: "ไม่สามารถยื่นคำร้องขอถอนวิชาเรียนได้มากกว่า 1 คำร้องต่อ 1 ภาคการศึกษา" })
            } else {
                res.status(200).json(await Form.create(form))
            }
        } else if (form.titleID == "A") {
            if (new Date(req.user.dateTime) <= new Date(startTerm.setDate(startTerm.getDate() + 21))) {
                res.status(200).json(await Form.create(form))
            } else {
                return res.status(401).json({ msg: "เลยเวลาที่กำหนด" })
            }
        }
        for (let i = 0; i <= form.requireInfo.sub_teach.length; i++) {
            const lineTK = await Users.findById(form.requireInfo.sub_teach[i]?.teacher)
            if (lineTK != undefined && lineTK.lineToken.thereIs) {
                await axios.post('https://notify-api.line.me/api/notify',
                    queryString.stringify({ message: 'คุณมีคำร้องใหม่' }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': 'Bearer ' + lineTK.lineToken.token
                        }
                    },
                )
            }
        }

    } catch (err) {
        console.log(err);
    }
})

router.get('/req_detail/:id', auth, async (req, res) => {
    res.status(200).json(await Form.findById(req.params.id))

})

router.put('/req_decide/:id', auth, async (req, res) => {
    try {
        const docInfo = await req.body
        const { studentInfo } = await Form.findById(req.params.id)
        if (docInfo.titleID == 'I') {
            if (req.user.role == 'Teacher') {
                if (docInfo.status == 'yes') {
                    await Form.findOneAndUpdate({ $and: [{ _id: req.params.id }, { 'requireInfo.sub_teach.teacher': req.user._id }] },
                        {
                            $set: {
                                'requireInfo.sub_teach.$[].tStatus.Approved': docInfo.status,
                                'requireInfo.sub_teach.$[].tStatus.AcessDoc': false,
                                'requireInfo.sub_teach.$[].tStatus.dateTime': date,
                                'requireInfo.sub_teach.$[].tStatus.tsign': req.user._id,
                                'requireInfo.sub_teach.$[].tStatus.Comment': docInfo.comment,
                                docStat: 'รอการลงนามจากผู้ลงนาม',
                                processState: '1',
                                'reqStatus.sign.AcessDoc': true,
                            }
                        })
                    return res.status(200).json()
                } else {
                    await Form.findByIdAndUpdate(req.params.id, {
                        'requireInfo.sub_teach.$[].tStatus.Approved': docInfo.status,
                        'requireInfo.sub_teach.$[].tStatus.Comment': docInfo.comment,
                        'requireInfo.sub_teach.$[].tStatus.dateTime': date,
                        'requireInfo.sub_teach.$[].tStatus.AcessDoc': false,
                        'requireInfo.sub_teach.$[].tStatus.tsign': req.user._id,
                        docStat: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน',
                        docStatus: false,
                        $unset: { processState: '', endState: '' }
                    })
                    if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                        await axios.post('https://notify-api.line.me/api/notify',
                            queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน' }),
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                }
                            },
                        )
                    }
                    return res.status(200).json()
                }
            } else if (req.user.role == 'DirectorOfRegistration') {
                if (docInfo.status == 'yes') {
                    await Form.findByIdAndUpdate(req.params.id,
                        {
                            $set: {
                                'reqStatus.sign.Approved': docInfo.status,
                                'reqStatus.sign.AcessDoc': false,
                                'reqStatus.sign.dateTime': date,
                                'reqStatus.sign.sign': req.user._id,
                                docStat: 'รอการดำเนินการจากนายทะเบียน',
                                processState: '2',
                                'reqStatus.regis.AcessDoc': true,
                            }
                        })
                    return res.status(200).json()
                } else {
                    await Form.findByIdAndUpdate(req.params.id, {
                        docStat: 'คำร้องไม่ได้รับการอนุมัติจากผู้อำนวยการ',
                        'reqStatus.sign.Approved': docInfo.status,
                        'reqStatus.sign.dateTime': date,
                        'reqStatus.sign.sign': req.user._id,
                        'reqStatus.sign.AcessDoc': false,
                        docStatus: false,
                        $unset: { processState: '', endState: '' }
                    })
                    if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                        await axios.post('https://notify-api.line.me/api/notify',
                            queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากผู้อำนวยการ' }),
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                }
                            },
                        )
                    }
                    return res.status(200).json()
                }
            } else if (req.user.role == 'Registrar') {
                if (docInfo.status == 'yes') {
                    await Form.findByIdAndUpdate(req.params.id,
                        {
                            $set: {
                                'reqStatus.regis.Approved': docInfo.status,
                                'reqStatus.regis.AcessDoc': false,
                                'reqStatus.regis.dateTime': date,
                                'reqStatus.regis.sign': req.user._id,
                                docStat: 'คำร้องได้รับการอนุมัติ',
                                docStatus: false,
                                $unset: { processState: '', endState: '' }
                            }
                        })
                    return res.status(200).json()
                } else {
                    await Form.findByIdAndUpdate(req.params.id, {
                        docStat: 'คำร้องไม่ได้รับการอนุมัติจากนายทะเบียน',
                        'reqStatus.regis.dateTime': date,
                        'reqStatus.regis.Approved': docInfo.status,
                        'reqStatus.regis.sign': req.user._id,
                        'reqStatus.regis.AcessDoc': false,
                        docStatus: false,
                        $unset: { processState: '', endState: '' }
                    })
                    if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                        await axios.post('https://notify-api.line.me/api/notify',
                            queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากนายทะเบียน' }),
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                }
                            },
                        )
                    }
                    return res.status(200).json()
                }

            }

        } else if (docInfo.titleID == 'W') {
            if (req.user.role == 'Teacher') {
                if (docInfo.status == 'yes') {
                    await Form.findOneAndUpdate({ $and: [{ _id: req.params.id }, { 'requireInfo.sub_teach.teacher': req.user._id }] },
                        {
                            $set: {
                                'requireInfo.sub_teach.$.tStatus.Approved': docInfo.status,
                                'requireInfo.sub_teach.$.tStatus.AcessDoc': false,
                                'requireInfo.sub_teach.$.tStatus.tsign': req.user._id,
                            }
                        })
                    res.status(200).json()
                } else {
                    await Form.findOneAndUpdate({ $and: [{ _id: req.params.id }, { 'requireInfo.sub_teach.teacher': req.user._id }] },
                        {
                            $set: {
                                'requireInfo.sub_teach.$.tStatus.Approved': docInfo.status,
                                'requireInfo.sub_teach.$.tStatus.AcessDoc': false,
                            }
                        })
                    res.status(200).json()
                }
                const check = await Form.findById(req.params.id)
                if (check.requireInfo.sub_teach.length == 1) {
                    if (await check.requireInfo.sub_teach[0].tStatus.Approved == 'no') {
                        await Form.findByIdAndUpdate(req.params.id, {
                            docStat: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน',
                            docStatus: false,
                            $unset: { processState: '', endState: '' }
                        })
                        if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                            await axios.post('https://notify-api.line.me/api/notify',
                                queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน' }),
                                {
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                    }
                                },
                            )
                        }
                        return res.status(200).json()
                    } else {
                        await Form.findByIdAndUpdate(req.params.id, {
                            'reqStatus.sign.AcessDoc': true,
                            processState: '1',
                            docStat: 'รอการลงนามจากผู้ลงนาม',
                        })
                        return res.status(200).json()
                    }
                } else {
                    for (i = 0; i < check.requireInfo.sub_teach.length; i++) {
                        if (await check.requireInfo.sub_teach[i].tStatus.Approved == 'no') {
                            await count++
                        }
                    }
                    if (count == check.requireInfo.sub_teach.length) {
                        await Form.findByIdAndUpdate(req.params.id, {
                            docStat: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน',
                            docStatus: false,
                            $unset: { processState: '', endState: '' }
                        })
                        if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                            await axios.post('https://notify-api.line.me/api/notify',
                                queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน' }),
                                {
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                    }
                                },
                            )
                        }
                        return res.status(200).json()
                    }
                    count = 0
                    for (i = 0; i < check.requireInfo.sub_teach.length; i++) {
                        if (await check.requireInfo.sub_teach[i].tStatus.AcessDoc == false && await check.requireInfo.sub_teach[i].tStatus.Approved != 'unknown') {
                            await count++
                        }
                    }
                    if (count == check.requireInfo.sub_teach.length) {
                        await Form.findByIdAndUpdate(req.params.id, {
                            'reqStatus.sign.AcessDoc': true,
                            processState: '1',
                            docStat: 'รอการลงนามจากผู้ลงนาม',
                        })
                        return res.status(200).json()
                    }
                    count = 0

                }
            } else if (req.user.role == 'DirectorOfRegistration') {
                if (docInfo.status == 'yes') {
                    await Form.findByIdAndUpdate(req.params.id,
                        {
                            $set: {
                                'reqStatus.sign.Approved': docInfo.status,
                                'reqStatus.sign.AcessDoc': false,
                                'reqStatus.sign.dateTime': date,
                                'reqStatus.sign.sign': req.user._id,
                                processState: '2',
                                docStat: 'รอการดำเนินการจากนายทะเบียน',
                                'reqStatus.office.AcessDoc': true,
                            }
                        })
                    return res.status(200).json()
                } else {
                    await Form.findByIdAndUpdate(req.params.id, {
                        docStat: 'คำร้องไม่ได้รับการอนุมัติจากผู้อำนวยการ',
                        'reqStatus.sign.Approved': docInfo.status,
                        'reqStatus.sign.AcessDoc': false,
                        'reqStatus.sign.dateTime': date,
                        'reqStatus.sign.sign': req.user._id,
                        docStatus: false,
                        $unset: { processState: '', endState: '' }
                    })
                    if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                        await axios.post('https://notify-api.line.me/api/notify',
                            queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากผู้อำนวยการ' }),
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                }
                            },
                        )
                    }
                    return res.status(200).json()
                }
            } else if (req.user.role == 'Officer') {
                if (docInfo.status == 'yes') {
                    await Form.findByIdAndUpdate(req.params.id,
                        {
                            $set: {
                                'reqStatus.office._id': req.user._id,
                                'reqStatus.office.Approved': docInfo.status,
                                'reqStatus.office.AcessDoc': false,
                                'reqStatus.office.dateTime': date,
                                'reqStatus.office.sign': req.user._id,
                                processState: '3',
                                docStat: 'คำร้องได้รับการอนุมัติ',
                                docStatus: false,
                                $unset: { processState: '', endState: '' }
                            }
                        })
                    return res.status(200).json()
                } else {
                    await Form.findByIdAndUpdate(req.params.id, {
                        docStat: 'คำร้องไม่ได้รับการอนุมัติจากเจ้าหน้าที่พนักงาน',
                        'reqStatus.office.Approved': docInfo.status,
                        'reqStatus.office.dateTime': date,
                        'reqStatus.office.Comment': docInfo.comment,
                        'reqStatus.office.sign': req.user._id,
                        'reqStatus.Office.AcessDoc': false,
                        docStatus: false,
                        $unset: { processState: '', endState: '' }
                    })
                    if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                        await axios.post('https://notify-api.line.me/api/notify',
                            queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากเจ้าหน้าที่พนักงาน' }),
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                }
                            },
                        )
                    }
                    return res.status(200).json()
                }
            }
        } else if (docInfo.titleID == 'A') {
            if (req.user.role == 'Teacher') {
                if (docInfo.status == 'yes') {
                    await Form.findOneAndUpdate({ $and: [{ _id: req.params.id }, { 'requireInfo.sub_teach.teacher': req.user._id }] },
                        {
                            $set: {
                                'requireInfo.sub_teach.$.tStatus.Approved': docInfo.status,
                                'requireInfo.sub_teach.$.tStatus.AcessDoc': false,
                                'requireInfo.sub_teach.$.tStatus.tsign': req.user._id,
                            }
                        })
                    res.status(200).json()
                } else {
                    await Form.findOneAndUpdate({ $and: [{ _id: req.params.id }, { 'requireInfo.sub_teach.teacher': req.user._id }] },
                        {
                            $set: {
                                'requireInfo.sub_teach.$.tStatus.Approved': docInfo.status,
                                'requireInfo.sub_teach.$.tStatus.AcessDoc': false,
                            }
                        })
                    res.status(200).json()
                }
                const check = await Form.findById(req.params.id)
                if (check.requireInfo.sub_teach.length == 1) {
                    if (await check.requireInfo.sub_teach[0].tStatus.Approved == 'no') {
                        await Form.findByIdAndUpdate(req.params.id, {
                            docStat: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน',
                            docStatus: false,
                            $unset: { processState: '', endState: '' }
                        })
                        if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                            await axios.post('https://notify-api.line.me/api/notify',
                                queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน' }),
                                {
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                    }
                                },
                            )
                        }
                        return res.status(200).json()
                    } else {
                        await Form.findByIdAndUpdate(req.params.id, {
                            'reqStatus.office.AcessDoc': true,
                            processState: '1',
                            docStat: 'รอการตรวจสอบจากเจ้าหน้าที่งานหลักสูตร',
                        })
                        return res.status(200).json()
                    }

                } else {
                    for (i = 0; i < check.requireInfo.sub_teach.length; i++) {
                        if (await check.requireInfo.sub_teach[i].tStatus.Approved == 'no') {
                            await count++
                        }
                    }
                    if (count == check.requireInfo.sub_teach.length) {
                        await Form.findByIdAndUpdate(req.params.id, {
                            docStat: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน',
                            docStatus: false,
                            $unset: { processState: '', endState: '' }
                        })
                        if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                            await axios.post('https://notify-api.line.me/api/notify',
                                queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากผู้สอน' }),
                                {
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                    }
                                },
                            )
                        }
                        return res.status(200).json()
                    }
                    count = 0
                    for (i = 0; i < check.requireInfo.sub_teach.length; i++) {
                        if (await check.requireInfo.sub_teach[i].tStatus.AcessDoc == false && await check.requireInfo.sub_teach[i].tStatus.Approved != 'unknown') {
                            await count++
                        }
                    }
                    if (count == check.requireInfo.sub_teach.length) {
                        await Form.findByIdAndUpdate(req.params.id, {
                            'reqStatus.office.AcessDoc': true,
                            processState: '1',
                            docStat: 'รอการตรวจสอบจากเจ้าหน้าที่งานหลักสูตร',
                        })
                        return res.status(200).json()
                    }
                    count = 0
                }
            } else if (req.user.role == 'Officer') {
                const em = await Form.findById(req.params.id)
                if (em.reqStatus.office.C_Approved == 'unknown') {
                    if (docInfo.status == 'yes') {
                        await Form.findByIdAndUpdate(req.params.id,
                            {
                                $set: {
                                    'reqStatus.office._id': req.user._id,
                                    'reqStatus.office.C_Approved': docInfo.status,
                                    'reqStatus.office.AcessDoc': false,
                                    'reqStatus.office.C_dateTime': date,
                                    'reqStatus.office.C_Comment': docInfo.comment,
                                    'reqStatus.office.C_sign': req.user._id,
                                    processState: '2',
                                    docStat: 'รอการลงนามจากผู้ลงนาม',
                                    'reqStatus.sign.AcessDoc': true,
                                }
                            })
                        return res.status(200).json()
                    } else {
                        await Form.findByIdAndUpdate(req.params.id, {
                            docStat: 'คำร้องไม่ได้รับการอนุมัติจากเจ้าหน้าที่งานหลักสูตร',
                            'reqStatus.office.C_Approved': docInfo.status,
                            'reqStatus.office.C_sign': req.user._id,
                            'reqStatus.office.C_dateTime': date,
                            'reqStatus.office.C_Comment': docInfo.comment,
                            'reqStatus.Office.AcessDoc': false,
                            docStatus: false,
                            $unset: { processState: '', endState: '' }
                        })
                        if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                            await axios.post('https://notify-api.line.me/api/notify',
                                queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากเจ้าหน้าที่งานหลักสูตร' }),
                                {
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                    }
                                },
                            )
                        }
                        return res.status(200).json()
                    }
                } else {
                    if (docInfo.status == 'yes') {
                        await Form.findByIdAndUpdate(req.params.id,
                            {
                                $set: {
                                    'reqStatus.office._id': req.user._id,
                                    'reqStatus.office.Approved': docInfo.status,
                                    'reqStatus.office.AcessDoc': false,
                                    'reqStatus.office.dateTime': date,
                                    'reqStatus.office.sign': req.user._id,
                                    processState: '4',
                                    docStat: 'คำร้องได้รับการอนุมัติ',
                                    docStatus: false,
                                    $unset: { processState: '', endState: '' }
                                }
                            })
                        return res.status(200).json()
                    } else {
                        await Form.findByIdAndUpdate(req.params.id, {
                            docStat: 'คำร้องไม่ได้รับการอนุมัติจากเจ้าหน้าที่ทะเบียน',
                            'reqStatus.office.Approved': docInfo.status,
                            'reqStatus.office.sign': req.user._id,
                            'reqStatus.office.Comment': docInfo.comment,
                            'reqStatus.office.dateTime': date,
                            'reqStatus.Office.AcessDoc': false,
                            docStatus: false,
                            $unset: { processState: '', endState: '' }
                        })
                        if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                            await axios.post('https://notify-api.line.me/api/notify',
                                queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากเจ้าหน้าที่ทะเบียน' }),
                                {
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                    }
                                },
                            )
                        }
                        return res.status(200).json()
                    }
                }

            } else if (req.user.role == 'DirectorOfRegistration') {
                if (docInfo.status == 'yes') {
                    await Form.findByIdAndUpdate(req.params.id,
                        {
                            $set: {
                                'reqStatus.sign._id': req.user._id,
                                'reqStatus.sign.Approved': docInfo.status,
                                'reqStatus.sign.AcessDoc': false,
                                'reqStatus.sign.dateTime': date,
                                'reqStatus.sign.sign': req.user._id,
                                processState: '3',
                                docStat: 'รอการดำเนินการจากเจ้าหน้าที่ทะเบียน',
                                'reqStatus.office.AcessDoc': true,
                            }
                        })
                    return res.status(200).json()
                } else {
                    await Form.findByIdAndUpdate(req.params.id, {
                        docStat: 'คำร้องไม่ได้รับการอนุมัติจากผู้อำนวยการ',
                        'reqStatus.sign.Approved': docInfo.status,
                        'reqStatus.sign.AcessDoc': false,
                        'reqStatus.sign.sign': req.user._id,
                        'reqStatus.sign.dateTime': date,
                        'reqStatus.sign.sign': req.user._id,
                        docStatus: false,
                        $unset: { processState: '', endState: '' }
                    })
                    if (studentInfo != undefined && studentInfo.lineToken.thereIs) {
                        await axios.post('https://notify-api.line.me/api/notify',
                            queryString.stringify({ message: 'คำร้องไม่ได้รับการอนุมัติจากผู้อำนวยการ' }),
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Authorization': 'Bearer ' + studentInfo.lineToken.token
                                }
                            },
                        )
                    }
                    return res.status(200).json()
                }
            }
        }
    } catch (err) { console.log(err); }

})
module.exports = router;
