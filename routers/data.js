const express = require("express");
const router = express.Router();
const Moment = require("moment");
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);

const Subject = require("../models/Subject");
const Role = require("../models/Role");
const Course = require("../models/Course")
const Major = require("../models/Major")
const auth = require('../middleware/auth');


router.post("/create-subject", async (req, res) => {
  try {
    const subject = req.body;
    if (await Subject.findOne({ SubJID: subject.SubJID })) {
      return res.status(409).json({ msg: "รหัสรายวิชาซ้ำ" });
    }
    await Subject.create(subject);
  } catch (err) {
    console.log(err);
  }
});

router.get("/subject", async (req, res) => {
  try {
    const subJ = await Subject.find()
    res.json(subJ)
  } catch (err) {
    console.log(err);
  }
});

router.get("/subject_A", async (req, res) => {
  try {
    const subJ = await Subject.find({ status: true })
    res.json(subJ)
  } catch (err) {
    console.log(err);
  }
});

router.get("/subject/:id", async (req, res) => {
  try {
    res.json(await Subject.findById(req.params.id))
  } catch (err) {
    console.log(err);
  }
});

router.delete("/delete-subject/:id", async (req, res) => {
  try {
    const removedSubJ = await Subject.findByIdAndDelete(req.params.id)
    res.status(200).json(removedSubJ)
  } catch (err) {
    console.log(err);
  }
})

router.put("/update-subject/:id", async (req, res) => {
  try {
    const subject = req.body;
    const updatedSubJ = await Subject.findByIdAndUpdate(req.params.id, subject)
    if (!updatedSubJ) {
      return res.status(409).json({ msg: "บันทึกไม่สำเร็จ" });
    }
    res.status(200).json(updatedSubJ)
  } catch (err) {
    console.log(err);
  }
})

router.get("/role", async (req, res) => {
  try {
    const role = await Role.find({role:{$ne: 'Student'}})
    res.json(role)
  } catch (err) {
    console.log(err);
  }
})

router.get("/course", auth, async (req, res) => {
  try {
    res.status(200).json(await Course.find())
  } catch (err) {
    console.log(err);
  }
})

router.get("/course_detail/:id", auth, async (req, res) => {
  try {
    const { course } = await Course.findById(req.params.id)
    res.status(200).json(course)
  } catch (err) {
    console.log(err);
  }
})

router.get("/course_I", auth, async (req, res) => {
  try {
    const { ex_term, classOf } = await Course.findOne({ $and: [{ startTerm: { $lte: req.user.dateTime } }, { endTerm: { $gte: req.user.dateTime } }, { major: req.user.major }, { classOf: req.user.classOf }] })
    const { term, course }  = await Course.findOne({ term: ex_term, classOf: classOf, major: req.user.major })
    res.status(200).json({ term, course })
  } catch (err) {
    console.log(err);
  }
})

router.get("/course_W", auth, async (req, res) => {
  try {
    const { term, course }  = await Course.findOne({ $and: [{ startTerm: { $lte: req.user.dateTime } }, { endTerm: { $gte: req.user.dateTime } }, { major: req.user.major }, { classOf: req.user.classOf }] })
    res.status(200).json({ term, course })
  } catch (err) {
    console.log(err);
  }
})

router.get("/course_A", auth, async (req, res) => {
  try {
    const { term } = await Course.findOne({ $and: [{ startTerm: { $lte: req.user.dateTime } }, { endTerm: { $gte: req.user.dateTime } }, { major: req.user.major }, { classOf: req.user.classOf }] })
    res.status(200).json({ term })
  } catch (err) {
    console.log(err);
  }
})

router.post("/sub_A", auth, async (req, res) => {
  try {
    const subject = req.body
    const same = await Course.findOne({ $and: [{ startTerm: { $lte: req.user.dateTime } }, { endTerm: { $gte: req.user.dateTime } }, { major: req.user.major }, { course: { $elemMatch: { subject: subject.subject } } }, { classOf: req.user.classOf }] })
    if (same) {
      return res.status(409).json({ msg: "วิชาซ้ำกับแผนวิชา" })
    } else {
      const range = await Course.findOne({ $and: [{ startTerm: { $lte: req.user.dateTime } }, { endTerm: { $gte: req.user.dateTime } }, { major: req.user.major }, { classOf: req.user.classOf }] })
      for (let i = 0; i < range.course.length; i++) {
        for (let j = 0; j < range.course.length; j++) {
          if (range.course[j].subject.NameDate == subject.subject.NameDate) {
            const startRange = moment.range(moment(range.course[j].subject.StartH, "HH:mm"), moment(range.course[j].subject.EndH, 'HH:mm'))
            const endRange = moment.range(moment(subject.subject.StartH, "HH:mm"), moment(subject.subject.EndH, "HH:mm"))
            if (startRange.overlaps(endRange) || endRange.overlaps(startRange)) {
              return res.status(409).json({ msg: "เวลาซ้ำกับวิชาในแผน" })
            }
          }
        }
        const sub = await Course.findOne({ $and: [{ startTerm: { $lte: req.user.dateTime } }, { endTerm: { $gte: req.user.dateTime } }], course: { $elemMatch: { subject: subject.subject } }, classOf: { $ne: req.user.classOf } })
        if (sub == null) {
          return res.status(409).json({ msg: "ไม่มีเปิดสอนในภาคการศึกษานี้" })
        } else if (sub.course[i].subject._id == subject.subject._id) {
          const { _id,major, classOf, group } = sub
          const teach = sub.course[i].teacher
          return res.status(200).json({_id, major, classOf, group,teach })
        }

      }
    }
  } catch (err) {
    console.log(err);
  }
});

router.post("/create-course", async (req, res) => {
  try {
    res.status(200).json(await Course.create(req.body))
  } catch (err) {
    console.log(err);
  }
})

router.post("/create-major", async (req, res) => {
  try {
    const major = req.body;
    if (await Major.findOne({ majorID: major.majorID })) {
      return res.status(409).json({ msg: "รหัสสาขา" });
    }
    await Major.create(major);
  } catch (err) {
    console.log(err);
  }
});

router.get("/major", async (req, res) => {
  try {
    res.json(await Major.find())
  } catch (err) {
    console.log(err);
  }
});

router.get("/major/:id", async (req, res) => {
  try {
    res.json(await Major.findById(req.params.id))
  } catch (err) {
    console.log(err);
  }
});

router.delete("/delete-major/:id", async (req, res) => {
  try {
    res.status(200).json(await Major.findByIdAndDelete(req.params.id))
  } catch (err) {
    console.log(err);
  }
})

router.put("/update-major/:id", async (req, res) => {
  try {
    const major = req.body;
    const updatedM = await Major.findByIdAndUpdate(req.params.id, major)
    if (!updatedM) {
      return res.status(409).json({ msg: "บันทึกไม่สำเร็จ" });
    }
    res.status(200).json(updatedM)
  } catch (err) {
    console.log(err);
  }
})
module.exports = router;
