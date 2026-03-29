import { useSelector } from 'react-redux';
import { getReactPressDisplayName } from '../../utils/userUtils';

function UserDisplay() {
    const { userInfo, isLoggedIn } = useSelector((state) => state.user);
    
    // Get current display name
    const displayName = getReactPressDisplayName() || userInfo?.display_name || userInfo?.first_name || 'Guest';
    
    return (
        <div className="bg-gray-100 px-3 py-2 rounded-md text-sm">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLoggedIn ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-gray-700">
                    {isLoggedIn ? `Logged in as: ${displayName}` : 'Not logged in (Guest)'}
                </span>
            </div>
            {userInfo?.email && (
                <div className="text-xs text-gray-500 mt-1">
                    {userInfo.email}
                </div>
            )}
        </div>
    );
}

export default UserDisplay;
