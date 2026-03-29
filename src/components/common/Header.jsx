import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const navigate = useNavigate();

    return (
        <header className="w-full bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
            <div className="flex-1">
                {/* Left side spacer or menu button can go here */}
            </div>
            
            <div 
                className="flex-1 text-center cursor-pointer"
                onClick={() => navigate('/')}
            >
                <h1 className="text-2xl font-extrabold tracking-tight text-[#10196A]">
                    TeeCraft<span className="text-blue-600">Studio</span>
                </h1>
            </div>

            <div className="flex-1 flex justify-end gap-4">
                {/* Right side icons or buttons can go here */}
            </div>
        </header>
    );
};

export default Header;
