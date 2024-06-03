/* global strapi */

const ImageKit = require('imagekit');

module.exports = {
    init: config => {
        let uploadFolder = config.params?.folder || '/';
        console.log('config', config);
        console.log('config params', config.params);
        const uploadEnvironment = config.params?.uploadEnvironment || 'production';
        console.log('uploadEnvironment', uploadEnvironment);
        const imagekitProvider = new ImageKit({
            publicKey: config.publicKey,
            privateKey: config.privateKey,
            urlEndpoint: config.urlEndpoint,
        });

        const upload = (file, customConfig) => {

            // console.log('Custom config', customConfig);
            // console.log('IMAGE KIT file', file);
            const imageKitStrapiFolders = config.params?.imagekitStrapiFolders.split(',');
            const imageKitStrapiFoldersMatch = config.params?.imageKitStrapiFoldersMatch.split(',');
            const pathIndex = imageKitStrapiFolders.indexOf(file.folderPath);

            // uploadFolder = pathIndex === -1
            //     ? '/Strapi-thumbnails'
            //     : imageKitStrapiFoldersMatch[pathIndex];
            const filePathFromCaption = file.caption?.startsWith('filePath:') && file.caption.split('filePath:')[1];
            console.log('filePathFromCaption', filePathFromCaption);
            uploadFolder = pathIndex !== -1
                ? imageKitStrapiFoldersMatch[pathIndex]
                : (filePathFromCaption || '/Strapi-thumbnails')
            const isAvatar = pathIndex !== -1 && file.folderPath?.startsWith(config.params?.folderAvatars);
            const isMiscOrPageFile = pathIndex !== -1 && !file.folderPath?.startsWith(config.params?.folderAvatars);
            console.log('uploadFolder', uploadFolder);
            // console.log('config', config);
            // console.log('config params', config.params);
            // Todo: add file folderPath in each STRAPI controller to sort files in Klubs/{KlubSlug} folders (/projects/{ProjectSlug} folders) and Members/{MemberSlug} folders
            // Set uploadFolder with folderPath
            return new Promise((resolve, reject) => {
                // let transformation = undefined;
                if (file.mime.startsWith('video/')) {
                    console.log('VIDEO FILE', file.mime);
                    // transformation = {
                    //     pre: [
                    //         {
                    //             type: 'transformation',
                    //             value: 'w-100'
                    //         }
                    //     ]
                    // };
                }
                imagekitProvider.upload({
                    file : file.buffer || file.stream,
                    fileName : file.hash + file.ext,
                    folder: uploadFolder,
                    // transformation,
                    customMetadata: {
                        category: 'strapi',
                        avatar: isAvatar,
                        isMiscOrPageFile: isMiscOrPageFile,
                        strapiHash: file.hash,
                        thumbnail: file.hash.startsWith('thumbnail_'),
                        uploadEnvironment: uploadEnvironment,
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
                        uploadEnvironment: uploadEnvironment,
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
                    console.log('DELETE IMAGE KIT FILE', fileId, file.provider_metadata, file);
                    const canDelete =  (uploadEnvironment === file.provider_metadata?.uploadEnvironment);
                        // || (uploadEnvironment === 'production' && file.provider_metadata?.uploadEnvironment === 'staging')
                        // || (uploadEnvironment === 'staging' && file.provider_metadata?.uploadEnvironment === 'development');
                    if (!canDelete) {
                        console.warn('Environment mismatch', uploadEnvironment, file.provider_metadata?.uploadEnvironment);
                        strapi.log.warn(`File not deleted. Environment mismatch. ID:${fileId}`);
                        return resolve();
                    }
                    imagekitProvider.deleteFile(fileId).then(response => {
                        console.log('!!!!!!  DELETE IMAGE KIT FILE response !!!!!!', response, fileId);
                        strapi.log.info(`File deleted. ID:${fileId}`);
                        return resolve();
                    }).catch(error => {
                        if (error.$ResponseMetadata?.statusCode === 404) {
                            strapi.log.warn(`File not found. Proceeding with deletion. ID:${fileId}`);
                            return resolve();
                        }
                        console.error('!!!!!!  DELETE IMAGE KIT FILE error !!!!!!', error, fileId);
                        strapi.log.error(`Unable to delete file. ID:${fileId}`);
                        return reject(error);
                    });
                });
            },
        };
    },
};
