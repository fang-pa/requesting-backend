const mongoose = require("mongoose");

const SubjectSchema = mongoose.Schema({
  SubJID: { type: "string", require: true, unique: true },
  SubJSec: { type: "string" },
  SubJName: { type: "string" },
  SubCredit: { type: "number" },
  NameDate: { type: "string" },
  StartH:{ type: 'string'},
  EndH:{ type: 'string'},
  status: { type: 'boolean' },
});
module.exports = mongoose.model("subject", SubjectSchema);
