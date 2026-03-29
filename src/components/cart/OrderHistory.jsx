import { useSelector } from 'react-redux';
import { formatOrderForDisplay } from '../../utils/cartUtils';

function OrderHistory() {
    const { lastOrder } = useSelector((state) => state.cart);

    if (!lastOrder) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Order History</h3>
                <p className="text-gray-500">No orders yet</p>
            </div>
        );
    }

    const formattedOrder = formatOrderForDisplay(lastOrder);

    return (
        <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Recent Order</h3>
            <div className="bg-white p-4 rounded border">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h4 className="font-medium">Order #{formattedOrder.orderNumber}</h4>
                        <p className="text-sm text-gray-600">Date: {formattedOrder.dateCreated}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">₹{formattedOrder.total}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                            formattedOrder.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : formattedOrder.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {formattedOrder.status}
                        </span>
                    </div>
                </div>
                
                <div className="border-t pt-3">
                    <h5 className="font-medium mb-2">Items:</h5>
                    {formattedOrder.lineItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm mb-1">
                            <span>{item.name} (Size: {item.size})</span>
                            <span>Qty: {item.quantity} - ₹{item.total}</span>
                        </div>
                    ))}
                </div>
                
                <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                        <span>Customer:</span>
                        <span>{formattedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Email:</span>
                        <span>{formattedOrder.customerEmail}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrderHistory;
