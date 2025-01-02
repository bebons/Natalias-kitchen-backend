const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    address: {
      street: {
        type: String,
        required: function () {
          return this.isDelivery;
        }, // Required if isDelivery is true
      },
      streetNumber: {
        type: String,
        required: function () {
          return this.isDelivery;
        }, // Required if isDelivery is true
      },
      floor: {
        type: String,
        required: function () {
          return this.isDelivery;
        }, // Required if isDelivery is true
      },
      flatNumber: {
        type: String,
        required: function () {
          return this.isDelivery;
        }, // Required if isDelivery is true
      },
    },
    phone: {
      type: String,
      required: true,
    },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Food",
        required: true,
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    isDelivery: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
