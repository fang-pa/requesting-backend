const mongoose = require("mongoose");

const RoleSchema = mongoose.Schema({
  role: { type: "string" },
  roleTh: { type: "string" }
})
module.exports = mongoose.model("role", RoleSchema);
