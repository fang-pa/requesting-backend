const mongoose = require("mongoose");
const autoIncrement = require('mongoose-auto-increment');

const FormRequestSchema = mongoose.Schema({
    docID: { type: 'number', required: true, unique: true },
    titleID: { type: 'string' },
    title: { type: 'string' },
    dateTime: { type: 'Date', default: Date.now },
    studentInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'users', autopopulate: true },
    requireInfo: {
        sub_teach: [{
            subject: { type: mongoose.Schema.Types.ObjectId, ref: 'subject', autopopulate: true },
            teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'users', autopopulate: true },
            course: { type: mongoose.Schema.Types.ObjectId, ref: 'course', autopopulate: true },
            tStatus: {
                Approved: { type: 'string', default: 'unknown' },
                Comment: { type: 'string' },
                AcessDoc: { type: 'Boolean', default: 'true' },
                dateTime: { type: 'Date' },
                tsign: { type: mongoose.Schema.Types.ObjectId, ref: 'users', autopopulate: true, default: null }
            }
        }],
        gradeYear: { type: 'string' },
        totalCredit: { type: 'string' },
        term: { type: 'string' },
        because: { type: 'string' },
    },
    reqStatus: {
        sign: {
            Approved: { type: 'string' },
            AcessDoc: { type: 'Boolean' },
            dateTime: { type: 'Date' },
            sign: { type: mongoose.Schema.Types.ObjectId, ref: 'users', autopopulate: true, default: null }
        },
        office: {
            Approved: { type: 'string' },
            Comment: { type: 'string' },
            AcessDoc: { type: 'Boolean' },
            dateTime: { type: 'Date' },
            sign: { type: mongoose.Schema.Types.ObjectId, ref: 'users', autopopulate: true },
            C_Approved: { type: 'string' },
            C_Comment: { type: 'string' },
            C_dateTime: { type: 'Date' },
            C_sign: { type: mongoose.Schema.Types.ObjectId, ref: 'users', autopopulate: true }
        },
        regis: {
            Approved: { type: 'string' },
            AcessDoc: { type: 'Boolean' },
            dateTime: { type: 'Date' },
            sign: { type: mongoose.Schema.Types.ObjectId, ref: 'users', autopopulate: true }
        },
    },
    processState: { type: 'string', default: '0' },
    endState: { type: 'string' },
    docStat: { type: 'string' },
    docStatus: { type: 'Boolean', default: true },
})

FormRequestSchema.plugin(require('mongoose-autopopulate'));

autoIncrement.initialize(mongoose.connection);
FormRequestSchema.plugin(autoIncrement.plugin, {
    model: 'formRequest',
    field: 'docID'
})

module.exports = mongoose.model("formRequest", FormRequestSchema)