/* global strapi */

const ImageKit = require('imagekit');

module.exports = {
    init: config => {
        let uploadFolder = config.params?.folder || '/';
        console.log('config', config);
        console.log('config params', config.params);

        const imagekitProvider = new ImageKit({
            publicKey: config.publicKey,
            privateKey: config.privateKey,
            urlEndpoint: config.urlEndpoint,
        });

        return {
            upload: file => {
                console.log('Config Avatar folder', config.params?.folderAvatars)
                const isAvatar = (file.folderPath === config.params?.folderAvatars);
                uploadFolder = isAvatar ? '/avatars' : '/strapi-thumbnails';
                console.log('IMAGE KIT file', file);
                console.log('uploadFolder', uploadFolder);
                // console.log('config', config);
                // console.log('config params', config.params);
                return new Promise((resolve, reject) => {
                    imagekitProvider.upload({
                        file : file.buffer,
                        fileName : file.hash + file.ext,
                        folder: uploadFolder,
                    }).then(response => {
                        const { fileId, url } = response;
                        console.log('IMAGE KIT FILE response', response);
                        file.url = url;
                        file.provider_metadata = {
                            fileId: fileId,
                            // avatar: isAvatar,
                        };
                        strapi.log.info(`File uploaded. ID:${fileId}`);
                        return resolve();
                    }).catch(error => {
                        strapi.log.error(`Unable to upload file.`);
                        return reject(error);
                    });
                });
            },
            delete: file => {
                return new Promise((resolve, reject) => {
                    const { fileId } = file.provider_metadata;
                    imagekitProvider.deleteFile(fileId).then(response => {
                        strapi.log.info(`File deleted. ID:${fileId}`);
                        return resolve();
                    }).catch(error => {
                        if (error.$ResponseMetadata?.statusCode === 404) {
                            strapi.log.warn(`File not found. Proceeding with deletion. ID:${fileId}`);
                            return resolve();
                        }
                        strapi.log.error(`Unable to delete file. ID:${fileId}`);
                        return reject(error);
                    });
                });
            },
        };
    },
};
