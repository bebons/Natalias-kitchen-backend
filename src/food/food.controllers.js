const Food = require("./food.model");
const fs = require("fs");
const path = require("path");

const postFood = async (req, res) => {
  try {
    const newFood = await Food({ ...req.body });
    await newFood.save();
    res
      .status(200)
      .send({ message: "Food posted successfully", food: newFood });
  } catch (err) {
    console.error("Food not added", err);
    res.status(500).send({ message: "Failed to create" });
  }
};
const getAllFood = async (req, res) => {
  try {
    const foods = await Food.find().sort({ createdAt: -1 });
    res.status(200).send(foods);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to fetch" });
  }
};
const getSingleFood = async (req, res) => {
  try {
    const { id } = req.params;
    const food = await Food.findById(id);
    if (!food) {
      res.status(404).send({ message: "food not found" });
    }
    res.status(200).send(food);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to fetch" });
  }
};
const updateFood = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFood = await Food.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedFood) {
      res.status(404).send({ message: "food is not found" });
    }
    res.status(200).send({
      message: "food updated successfully",
      food: updatedFood,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to update" });
  }
};
const deleteFood = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFood = await Food.findByIdAndDelete(id);
    if (!deletedFood) {
      res.status(404).send({ messsage: "Food not found" });
    }
    // Delete the image file if it exists
    // const imagePath = `../../../frontend/src/assets/food/${deletedFood.coverImage}`;
    // if (fs.existsSync(imagePath)) {
    //   fs.unlinkSync(imagePath); // Delete the file
    // }
    res.status(200).send({
      message: "Food deleted successfully",
      food: deletedFood,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to delete" });
  }
};

module.exports = {
  postFood,
  getAllFood,
  getSingleFood,
  updateFood,
  deleteFood,
};
