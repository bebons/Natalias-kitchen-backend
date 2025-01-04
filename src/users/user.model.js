const mongoose = require("mongoose");
const Joi = require("joi");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
});

const unverifiedUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  verificationToken: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600,
  },
});

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

// userSchema.methods.generateAuthToken = function () {
//   const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET_KEY, {
//     expiresIn: "1h",
//   });
//   return token;
// };

const validate = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().label("Email"),
  });
  return schema.validate(data);
};

const Admin = mongoose.model("Admin", adminSchema);
const UnverifiedUser = mongoose.model("UnverifiedUser", unverifiedUserSchema);
const User = mongoose.model("User", userSchema);

module.exports = { UnverifiedUser, User, Admin, validate };
