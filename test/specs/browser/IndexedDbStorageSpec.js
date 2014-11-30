describe("IndexedDB storage", function () {
    "use strict";

    var db;

    var constructStorage = function (util) {
        return csscriticLib.indexeddbstorage(util);
    };

    beforeEach(function (done) {
        var request = indexedDB.open('csscritic', 1);
        request.onsuccess = function (event) {
            db = event.target.result;
            done();
        };
        request.onupgradeneeded = function(event) {
            var db = event.target.result;

            db.createObjectStore('references', { keyPath: "testCase" });
        };
    });

    afterEach(function (done) {
        db.close();

        var request = indexedDB.deleteDatabase('csscritic');
        request.onsuccess = done;
    });

    var readStoredReferenceImage = function () {
        var defer = ayepromise.defer();
        defer.resolve();
        return defer.promise;
    };

    var storeReferenceImage = function (key, stringData) {
        var defer = ayepromise.defer();
        // TODO move away from JSON encoded test input, doesn't match internals of this module
        var data = JSON.parse(stringData),
            dataObj = {};
        if (data.referenceImageUri) {
            dataObj.imageUri = data.referenceImageUri;
        }
        if (data.viewport) {
            dataObj.viewport = data.viewport;
        }
        var request = db.transaction(['references'], 'readwrite')
            .objectStore('references')
            .add({testCase: key, reference: dataObj});

        request.onsuccess = defer.resolve;

        return defer.promise;
    };

    loadStoragePluginSpecs(constructStorage, readStoredReferenceImage, storeReferenceImage);
});