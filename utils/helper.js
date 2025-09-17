import fs from 'fs/promises';
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(
    await fs.readFile(new URL('../utils/serviceAccountKey.json', import.meta.url), 'utf-8')
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export const sendNotification = async (message) => {
    try {
        message.android = { notification: { sound: "default" } };
        message.apns = {
            payload: { aps: { sound: "default" } }
        };

        const response = await admin.messaging().send(message);
        return { success: true, data: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const createNotificationMessage = async ({
    notificationSend,
    fullName,
    senderId,
    receiverId,
    senderRole,
    receiverRole,
    fcmToken,
    notificationType,
    package_no
}) => {
    let notification = {};

    switch (notificationSend) {
        case 'packageAppearToDriver':
            notification = {
                title: "New Package Available",
                body: `${fullName} has requested a package pickup near your location.`
            };
            break;

        case 'packageAccepted':
            notification = {
                title: "Package Accepted",
                body: `Your package has been accepted by the ${fullName} and will be collected soon.`
            };
            break;

        case 'packageCompleted':
            notification = {
                title: "Package Delivered",
                body: "Your package has been successfully delivered."
            };
            break;
        case 'noDriverAvailable':
            notification = {
                title: "No Drivers Available",
                body: "Sorry, drivers are busy or not available at the moment. Please try again later."
            };
            break;

        default:
            notification = {
                title: "Notification",
                body: "You have a new update."
            };
            break;
    }

    return {
        notification,
        data: {
            sendFrom: String(senderId ?? ""),
            sendTo: String(receiverId ?? ""),
            sendFromRole: String(senderRole ?? ""),
            sendToRole: String(receiverRole ?? ""),
            notificationType: String(notificationType ?? ""),
            packageNo: String(package_no ?? "")
        },
        token: fcmToken || ""
    };
};

export const NotificationTypes = {
    PACKAGE_APPEAR_TO_DRIVER: 1,
    PACKAGE_ACCEPTED: 2,
    PACKAGE_COMPLETED: 3,
    NO_DRIVER_AVAILABLE: 4
};