const express = require('express');
const router = express.Router();

const imageRoutes = require('./imageRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const customOptionsRoutes = require('./customOptionsRoutes');
const metalRatesRoutes = require('./metalRatesRoutes');
const UserRoutes = require('./UserRoutes');
const orderRoutes = require('./orderRoutes');
const dashRoutes = require('./dashRoutes');
const trackorderRoutes = require('./trackorderRoutes');
const menwomenkidsRoutes = require('./menwomenkidsRoutes');
const customRoutes = require('./customRoutes');
const allproductRoutes = require('./allproductRoutes');
const orderdetailRoutes = require('./orderdetailRoutes');
const loginRoutes = require('./loginRoutes');
const contactRoutes = require('./contactRoutes');
const contactviewRoutes = require('./contactviewRoutes');








// Register all routes with appropriate prefixes
router.use('/upload-image', imageRoutes);
router.use('/api', productRoutes);
router.use('/', categoryRoutes);     // Clean separation
router.use('/customOptions', customOptionsRoutes);
router.use('/', metalRatesRoutes);
router.use('/', UserRoutes); 
router.use('/', orderRoutes); 
router.use('/', dashRoutes);             // Clear user endpoints
router.use('/', trackorderRoutes); 
router.use('/', menwomenkidsRoutes);             // Clear user endpoints
router.use('/', customRoutes);
router.use('/', allproductRoutes); 
router.use('/', orderdetailRoutes);
router.use('/', loginRoutes);
router.use('/', contactRoutes);
router.use('/', contactviewRoutes);



          


module.exports = router;
