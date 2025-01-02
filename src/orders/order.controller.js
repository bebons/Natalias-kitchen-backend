const Order = require("./order.model");

const createAOrder = async (req, res) => {
  try {
    const newOrder = await Order(req.body);
    const savedOrder = await newOrder.save();
    res.status(200).json(savedOrder);
  } catch (err) {
    console.error("Error creating order", err);
    res.status(500).json({ message: "falied to create order" });
  }
};
const getOrderByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const orders = await Order.find({ email }).sort({ createdAt: -1 });
    if (!orders) {
      return res.status(404).json({ message: "orders not found" });
    }
    res.status(200).json(orders);
  } catch (err) {
    console.error("error fetching orders", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};
module.exports = {
  createAOrder,
  getOrderByEmail,
};
