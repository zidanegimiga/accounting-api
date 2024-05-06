const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { toJSON, paginate, deletion } = require('./plugins');
const validator = require('validator');

const employeesSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    mobile: String,
    department: String,
    designation: String,
    projectId: mongoose.Schema.Types.ObjectId,
    referenceId: mongoose.Schema.Types.ObjectId, // the id of the user from the db of the client
    role: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
      name: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true
  }
);

employeesSchema.pre('save', async function (next) {
  // Hash the password before saving the user model
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

employeesSchema.pre('findOneAndUpdate', async function (next) {
  // Hash the password before saving the user model

  const user = this;
  if (user._update.password !== undefined) {
    if (user._update.password.substr(0, 7) !== '$2a$08$') {
      user._update.password = await bcrypt.hash(user._update.password, 8);
    }
  }
  next();
});

employeesSchema.methods.checkUserPassword = async function () {
  const user = this;
  let userPassword = false;
  const password = 'password';
  if (password in user) {
    if (user.password !== '' && user.password !== undefined) {
      userPassword = true;
    } else {
      userPassword = false;
    }
  } else {
    userPassword = false;
  }
  return userPassword;
};

employeesSchema.methods.getFullName = function () {
  return `${this.first_name} ${this.last_name}`;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
employeesSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
employeesSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

employeesSchema.plugin(toJSON);
employeesSchema.plugin(paginate);
employeesSchema.plugin(deletion);

const Employees = mongoose.model('Employees', employeesSchema);
module.exports = Employees;
