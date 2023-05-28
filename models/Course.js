const mongoose = require("mongoose");

const courseSchema = mongoose.Schema({
    term: { type: "string" },
    ex_term: { type: "string" },
    startTerm: { type: 'Date' },
    endTerm: { type: 'Date' },
    major: { type: mongoose.Schema.Types.ObjectId ,ref:'major',autopopulate: true },
    classOf: { type: 'string' },
    group: { type: 'string' },
    course: [
        {
            subject: {type: mongoose.Schema.Types.ObjectId ,ref:'subject',autopopulate: true },
            teacher: {type: mongoose.Schema.Types.ObjectId ,ref:'users',autopopulate: true }
        }
    ],
})
courseSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('course', courseSchema)