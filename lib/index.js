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

        const upload = (file, customConfig) => {
            // console.log('Config Avatar folder', config.params?.folderAvatars);
            // console.log('Config Avatar folder M', config.params?.folderAvatarsMen);
            // console.log('Config Avatar folder W', config.params?.folderAvatarsWomen);
            console.log('Custom config', customConfig);
            console.log('IMAGE KIT file', file);
            // const isAvatar = (file.folderPath === config.params?.folderAvatars);
            // uploadFolder = isAvatar ? '/Avatars' : '/Strapi-thumbnails';

            const imageKitStrapiFolders = config.params?.imageKitStrapiFolders.split(',');
            const imageKitStrapiFoldersMatch = config.params?.imageKitStrapiFoldersMatch.split(',');
            const pathIndex = imageKitStrapiFolders.indexOf(file.folderPath);
            console.log('imageKitStrapiFolders', imageKitStrapiFolders);
            console.log('imageKitStrapiFoldersMatch', imageKitStrapiFoldersMatch);
            console.log('pathIndex', pathIndex);
            uploadFolder = pathIndex === -1
                ? '/Strapi-thumbnails'
                : imageKitStrapiFoldersMatch[pathIndex];
            // switch (file.folderPath) {
            //     case config.params?.folderAvatarsMen:
            //         uploadFolder = '/Avatars/Men';
            //         break;
            //     case config.params?.folderAvatarsWomen:
            //         uploadFolder = '/Avatars/Women';
            //         break;
            //     case config.params?.folderAvatars:
            //         uploadFolder = '/Avatars';
            //         break;
            //     default:
            //         uploadFolder = '/Strapi-thumbnails';
            //         break;
            // }
            console.log('uploadFolder', uploadFolder);
            // console.log('config', config);
            // console.log('config params', config.params);
            // Todo: add file folderPath in each STRAPI controller to sort files in Klubs/{KlubSlug} folders (/projects/{ProjectSlug} folders) and Members/{MemberSlug} folders
            // Set uploadFolder with folderPath

            return new Promise((resolve, reject) => {

                imagekitProvider.upload({
                    file : file.buffer || file.stream,
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
        };

        return {
            upload: (file, customConfig = {}) => {
                return upload(file, customConfig);
            },
            uploadStream: (file, customConfig = {}) => {
                return upload(file, customConfig);
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
