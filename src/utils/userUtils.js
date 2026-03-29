/**
 * Utility functions for handling ReactPress user data
 */

/**
 * Get ReactPress user information from window.reactPress.user
 * @returns {Object} User information object or empty object if not available
 */
export const getReactPressUserInfo = () => {
    try {
        const reactPressUser = window.reactPress?.user;
        if (reactPressUser?.data) {
            const userData = reactPressUser.data;
            const displayName = userData.display_name || userData.user_nicename || userData.user_login || "";
            const nameParts = displayName.trim().split(" ");
            
            return {
                first_name: nameParts[0] || "",
                last_name: nameParts.slice(1).join(" ") || "",
                email: userData.user_email || "",
                user_id: userData.ID || null,
                user_login: userData.user_login || "",
                display_name: userData.display_name || "",
                user_nicename: userData.user_nicename || "",
            };
        }
    } catch (error) {
        console.warn('Error accessing ReactPress user data:', error);
    }
    return {}; // Return empty object to let WooCommerce API handle defaults
};

/**
 * Check if ReactPress user is logged in
 * @returns {boolean} True if user is logged in, false otherwise
 */
export const isReactPressUserLoggedIn = () => {
    try {
        const reactPressUser = window.reactPress?.user;
        return !!(reactPressUser?.data?.ID);
    } catch (error) {
        console.warn('Error checking ReactPress user login status:', error);
        return false;
    }
};

/**
 * Get user display name for UI purposes
 * @returns {string} User display name or empty string
 */
export const getReactPressDisplayName = () => {
    try {
        const userInfo = getReactPressUserInfo();
        return userInfo.display_name || userInfo.user_nicename || userInfo.user_login || "";
    } catch (error) {
        console.warn('Error getting ReactPress display name:', error);
        return "";
    }
};
