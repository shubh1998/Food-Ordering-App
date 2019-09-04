const mongoose = require('mongoose');
const cartSchema = mongoose.Schema({
    productId: String,
    userEmail: String,
    pQuantity: String
});

module.exports = mongoose.model('cart',cartSchema);