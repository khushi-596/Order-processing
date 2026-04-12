#include "orderManagement.h"
using namespace std;

//starting prder ID
OrderManagement::OrderManagement(Graph& g)
    : deliveryGraph(g), nextOrderID(1001)
{}

//compute priority
double OrderManagement::computePriority(const Order& order) const {
    int V     = deliveryGraph.getVertices(); //get shortest distance from warehouse
    int* dist = new int[V];
    deliveryGraph.dijkstra(0, dist);
    int graphDistance = (order.location >= 0 && order.location < V) ? dist[order.location] : 0;
    delete[] dist;
    
    //priority calculation formula
    double urgencyScore    = order.urgency  * 5.0;
    double valueScore      = order.value    * 2.0;
    double deadlineScore   = order.deadline * 3.0;
    double distancePenalty = graphDistance  * 1.0;
    return urgencyScore + valueScore + deadlineScore - distancePenalty;
}

//Add order
void OrderManagement::addOrder(int location, int urgency, double value, int deadline) {
    int maxLoc = deliveryGraph.getVertices() - 1;
    if (location < 1 || location > maxLoc) {
        cout << " Invalid location! Must be between 1 and " << maxLoc << ".\n";
        return;
    }
    if (urgency < 1 || urgency > 10) {
        cout << " Invalid urgency! Must be between 1 and 10.\n";
        return;
    }
    if (value <= 0) {
        cout << " Invalid order value! Must be greater than 0.\n";
        return;
    }
    if (deadline <= 0) {
        cout << " Invalid deadline! Must be greater than 0 minutes.\n";
        return;
    }
    
    //generate unique order ID
    int orderID = nextOrderID++;
    
    //create new order
    Order newOrder;
    newOrder.orderID      = orderID;
    newOrder.location     = location;
    newOrder.locationName = deliveryGraph.getLocation(location); //get location name
    newOrder.urgency      = urgency;
    newOrder.value        = value;
    newOrder.deadline     = deadline;
    newOrder.priority = computePriority(newOrder); //calculate priority
    newOrder.status   = "Pending";

    orderMap.insert(orderID, newOrder);
    priorityQueue.insertHeap(newOrder);

    cout << " Order Added Successfully!\n";
    cout << " Order ID : " << orderID           << "\n";
    cout << " Priority : " << newOrder.priority << "\n";
}

//search order
void OrderManagement::searchOrder(int orderID) const {
    Order* o = orderMap.search(orderID);
    if (o == nullptr) {
        cout << " Order " << orderID << " not found!\n";
        return;
    }
    cout << "\n─── Order Details ────────────────\n";
    cout << " Order ID : " << o->orderID      << "\n";
    cout << " Location : " << o->locationName << " (zone " << o->location << ")\n";
    cout << " Urgency  : " << o->urgency      << "\n";
    cout << " Value    : " << o->value        << "\n";
    cout << " Deadline : " << o->deadline     << " min\n";
    cout << " Priority : " << o->priority     << "\n";
    cout << " Status   : " << o->status       << "\n";
    cout << "──────────────────────────────────\n";
}

//cancel order
void OrderManagement::cancelOrder(int orderID) {
    Order* o = orderMap.search(orderID);
    if (o == nullptr) {
        cout << " Order " << orderID << " not found!\n";
        return;
    }
    if (o->status == "Canceled") {
        cout << " Order " << orderID << " is already canceled.\n";
        return;
    }
    if (o->status == "Processed") {
        cout << " Order " << orderID << " has already been processed and cannot be canceled.\n";
        return;
    }
    o->status = "Canceled";
    cout << " Order " << orderID << " canceled successfully.\n";
}

//process order
void OrderManagement::processOrder() {
    Order current;
    bool  found = false;

    while (!priorityQueue.isEmpty()) {
        current = priorityQueue.extractMax();

        if (current.orderID == 0) break;

        Order* live = orderMap.search(current.orderID);
        if (live != nullptr && live->status == "Pending") {
            found = true;
            break;
        }
    }

    if (!found) {
        cout << " No pending orders to process.\n";
        return;
    }
    
    //mark as processed
    orderMap.search(current.orderID)->status = "Processed";

    cout << "\n=== Processing Order " << current.orderID << " ===\n";
    cout << " Delivering to : " << current.locationName << " (zone " << current.location << ")\n";
    cout << " Priority      : " << current.priority << "\n";
    
    //calculate shortest path using dijkstra
    int  V    = deliveryGraph.getVertices();
    int* dist = new int[V];

    deliveryGraph.dijkstra(0, dist);
    int shortestTime = dist[current.location];
    delete[] dist;

    if (shortestTime == INF) {
        cout << " No path found to " << current.locationName << "!\n";
    } else {
        cout << " Shortest route from warehouse : " << shortestTime << " minutes\n";
        cout << " Order dispatched to " << current.locationName << "!\n";
    }
}

//check pending orders
bool OrderManagement::hasPendingOrders() const {
    return orderMap.hasPending();
}

//display all orders
void OrderManagement::displayAllOrders() const {
    int    count  = 0;
    Order* orders = orderMap.getAll(count);

    if (count == 0) {
        cout << " No orders in the system yet.\n";
        return;
    }

    cout << "\n=== All Orders ===\n";
    cout << "────────────────────────────────────────────────────────────────────\n";
    cout << "  ID  | Location           | Urg | Value | Deadline | Priority | Status\n";
    cout << "────────────────────────────────────────────────────────────────────\n";

    for (int i = 0; i < count; i++) {
        const Order& o = orders[i];
        std::string locField = o.locationName;
        if ((int)locField.size() < 18) locField += std::string(18 - locField.size(), ' ');
        cout << "  " << o.orderID
             << "  | " << locField
             << " |  " << o.urgency
             << "  | "  << o.value
             << "  |  " << o.deadline << " min"
             << "  |  " << o.priority
             << "  | "  << o.status   << "\n";
    }
    cout << "──────────────────────────────────────────────────────────\n";

    delete[] orders;
}
