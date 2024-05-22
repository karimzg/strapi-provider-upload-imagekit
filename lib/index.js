/* global strapi */

const ImageKit = require('imagekit');
const strapi = require('strapi');

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
            console.log('Custom config', customConfig);
            console.log('IMAGE KIT file', file);
            const imageKitStrapiFolders = config.params?.imagekitStrapiFolders.split(',');
            const imageKitStrapiFoldersMatch = config.params?.imageKitStrapiFoldersMatch.split(',');
            const pathIndex = imageKitStrapiFolders.indexOf(file.folderPath);

            //get strapi folderPath from file.folderPath
            // const re = await strapi.entityService.findMany("plugin::upload.file", {
            //
            // });

            // get strapi.entityService.findMany("plugin::upload.file", {}); like promise
            strapi.db.query.findMany("plugin::upload.file", {
                filters: {
                    folderPath: {
                        $eq: file.folderPath
                    }
                }
            }).then(response => {
                console.log('RE', response);            });

            //
            //
            console.log('RE', re);
            // uploadFolder = pathIndex === -1
            //     ? '/Strapi-thumbnails'
            //     : imageKitStrapiFoldersMatch[pathIndex];
            uploadFolder = pathIndex !== -1
                ? imageKitStrapiFoldersMatch[pathIndex]
                : (file.path || '/Strapi-thumbnails')
            const isAvatar = pathIndex !== -1 && file.folderPath?.startsWith(config.params?.folderAvatars);
            const isMiscOrPageFile = pathIndex !== -1 && !file.folderPath?.startsWith(config.params?.folderAvatars);
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
                    customMetadata: {
                        category: 'strapi',
                        avatar: isAvatar,
                        isMiscOrPageFile: isMiscOrPageFile,
                        strapiHash: file.hash,
                        thumbnail: file.hash.startsWith('thumbnail_'),
                    }
                }).then(response => {
                    const { fileId, url } = response;
                    console.log('IMAGE KIT FILE response', response, fileId);
                    file.url = url;
                    file.provider_metadata = {
                        fileId: fileId,
                        filePath: response.filePath,
                        avatar: isAvatar,
                        isMiscOrPageFile: isMiscOrPageFile,
                        strapiHash: file.hash,
                        thumbnail: file.hash.startsWith('thumbnail_'),
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
