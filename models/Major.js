const mongoose = require("mongoose");

const MajorSchema = mongoose.Schema({
  majorID: { type: "string" },
  majorName: { type: "string" }
})
module.exports = mongoose.model("major", MajorSchema);