const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  userID: { type: "string", require: true, unique: true },
  name: { type: "string" },
  surName: { type: "string" },
  password: { type: "string" },
  nameTitle: { type: 'string' },
  educationSector: { type: 'string' },
  phoneNum: { type: 'string' },
  classOf: { type: 'string' },
  eucationLevel: { type: 'string' },
  major: { type: mongoose.Schema.Types.ObjectId ,ref:'major',autopopulate: true },
  group: { type: 'string' },
  joined:{ type: "Date" },
  role: { type: mongoose.Schema.Types.ObjectId , ref:'role', autopopulate: true},
  token: { type: "string" },
  lineToken: {
    token: { type: "string" },
    thereIs: { type: "boolean" }
  },
  sign: { data: "Buffer", contentType: "String" },
});
UserSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model("users", UserSchema);

