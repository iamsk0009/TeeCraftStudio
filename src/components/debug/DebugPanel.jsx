import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import WooCommerceTestPage from './WooCommerceTestPage';

function DebugPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('woocommerce');

    useEffect(() => {
        const handleKeyDown = (event) => {
            // Toggle debug panel with Ctrl+Shift+D
            if (event.ctrlKey && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                setIsOpen(!isOpen);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) {
        return (
            <div className="fixed bottom-4 left-4 z-50">
                <div className="bg-gray-800 text-white px-3 py-1 rounded text-xs">
                    Press Ctrl+Shift+D for debug panel
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold">Debug Panel</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('woocommerce')}
                        className={`px-4 py-2 ${
                            activeTab === 'woocommerce'
                                ? 'border-b-2 border-blue-500 bg-blue-50'
                                : 'hover:bg-gray-50'
                        }`}
                    >
                        WooCommerce Test
                    </button>
                    <button
                        onClick={() => setActiveTab('state')}
                        className={`px-4 py-2 ${
                            activeTab === 'state'
                                ? 'border-b-2 border-blue-500 bg-blue-50'
                                : 'hover:bg-gray-50'
                        }`}
                    >
                        Redux State
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'woocommerce' && <WooCommerceTestPage />}
                    {activeTab === 'state' && <ReduxStateViewer />}
                </div>
            </div>
        </div>
    );
}

function ReduxStateViewer() {
    const cartState = useSelector((state) => state.cart);
    const productsState = useSelector((state) => state.products);
    const uploadState = useSelector((state) => state.upload);
    const userState = useSelector((state) => state.user);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">User State (ReactPress)</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(userState, null, 2)}
                </pre>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold mb-2">Cart State</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(cartState, null, 2)}
                </pre>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold mb-2">Products State</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(productsState, null, 2)}
                </pre>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold mb-2">Upload State</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(uploadState, null, 2)}
                </pre>
            </div>
        </div>
    );
}

export default DebugPanel;
