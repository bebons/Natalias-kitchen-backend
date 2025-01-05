const { Admin, User, validate, UnverifiedUser } = require("./user.model");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sendEmail = require("../middleware/sendEmail");

const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(404).send({ message: "admin not found" });
    }
    if (!(await bcrypt.compare(password, admin.password))) {
      return res.status(401).send({ message: "Invalid password" });
    }
    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    return res.status(200).json({
      message: "Authentication successful",
      token: token,
      user: {
        username: admin.username,
      },
    });
  } catch (err) {
    console.error("couldnt login as an admin", err);
    res.status(401).send({ message: "couldnt login as an admin" });
  }
};

const checkUserExistence = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User doesnt exist" });
    }
    res.status(200).json({
      message: "User found",
    });
  } catch (err) {
    console.error("Error occurred", err);
    res.status(500).send({ message: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Logika za brisanje korisnika iz MongoDB-a
    await User.deleteOne({ email });
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
};

const register = async (req, res) => {
  try {
    const { error } = validate(req.body);
    const { email } = req.body;
    console.log(req.body);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(409)
        .send({ message: "User with given email already Exist!" });
    }
    const verificationToken = crypto.randomBytes(32).toString("hex");

    user = await new UnverifiedUser({
      email,
      verificationToken,
    }).save();

    const url = `${process.env.BASE_URL}/verify/${verificationToken}`;
    await sendEmail(user.email, "Verify Email", url);

    res
      .status(201)
      .send({ message: "An Email sent to your account please verify" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const unverifiedUser = await UnverifiedUser.findOne({
      verificationToken: token,
    });
    if (!unverifiedUser) {
      return res
        .status(400)
        .send({ message: "Invalid or expired verification link" });
    }
    res.status(200).send({
      email: unverifiedUser.email,
      message: "Email verified successfully",
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error" });
  }
};

const finishRegistration = async (req, res) => {
  try {
    const { token } = req.params;

    const unverifiedUser = await UnverifiedUser.findOne({
      verificationToken: token,
    });
    if (!unverifiedUser) {
      return res
        .status(400)
        .send({ message: "Invalid or expired verification link" });
    }

    await new User({
      email: unverifiedUser.email,
    }).save();

    await UnverifiedUser.deleteOne({ _id: unverifiedUser._id });

    res.status(200).send({
      message: "Registration finished successfully",
    });
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  adminLogin,
  register,
  verifyEmail,
  finishRegistration,
  checkUserExistence,
  deleteUser,
};
