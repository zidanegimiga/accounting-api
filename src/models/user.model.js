const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const {toJSON, paginate, deletion} = require("./plugins");

const usersSchema = new mongoose.Schema({
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
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
    mobile: {
      type: String,
      unique: true,
    },
    password :{
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true, // used by the toJSON plugin
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
    },
    companies:{
      type:Array
     },
    is_deleted: {
      type: Number,
      default: 0,
    },
},
{
  timestamps: true
});

usersSchema.pre('save', async function (next) {
  // Hash the password before saving the user model
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

usersSchema.pre('findOneAndUpdate', async function (next) {
  // Hash the password before saving the user model

  const user = this;

  if (user._update.password !== undefined) {
    if (user._update.password.substr(0, 7) !== '$2a$08$') {
      user._update.password = await bcrypt.hash(user._update.password, 8);
    }
  }
  next();
});

usersSchema.methods.generateAuthToken = async function () {
  // Generate an auth token for the user
  const user = this;
  const token = jwt.sign({ _id: user._id }, process.env.JWT_KEY);
  user.tokens = user.tokens.concat({ token });
  // await user.save()
  return token;
};

usersSchema.methods.checkIsAdmin = async function () {
  // Generate an auth token for the user
  const user = this;
  let isAdmin = false;

  if (user.role_ID === '5e2ec39af3185a0b5036ef01') {
    isAdmin = true;
  }
  // await user.save()
  return isAdmin;
};

usersSchema.methods.getFullName = function () {
  return `${this.first_name} ${this.last_name}`;
};

usersSchema.statics.findByCredentials = async (email, password) => {
  // Search for a user by email and password.
  const user = await Users.findOne({ email });

  if (!user) {
    throw new Error({ error: 'Invalid login credentials' });
  }
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new Error({ error: 'Invalid login credentials' });
  }
  return user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
usersSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

// find by email
usersSchema.statics.findByEmail = async (email) => {
  // Search for a user by email.
  const user = await Users.findOne({ email: email,user_status:{$ne : 'Inactive'}});

  if (!user) {
      throw new Error({ error: 'No User Found' })
  }
  
  return user
}

usersSchema.plugin(toJSON);
usersSchema.plugin(paginate);
usersSchema.plugin(deletion);

const Users = mongoose.model('Users', usersSchema);
module.exports = Users;
