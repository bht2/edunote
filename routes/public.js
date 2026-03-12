const express = require('express');
const router  = express.Router();
const pub     = require('../controllers/publicController');

router.get('/',                                 pub.index);
router.get('/notes',                            pub.getSectors);
router.get('/notes/:sectorSlug',                pub.getSectorLevels);
router.get('/notes/:sectorSlug/:levelSlug',     pub.getLevelNotes);
router.get('/read/:id',                         pub.readNote);
router.get('/download/:id',                     pub.downloadNote);
router.get('/view/:id',                         pub.viewNote);

module.exports = router;