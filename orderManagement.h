#include "order.h"
#include "hashMap.h"
#include "maxHeap.h"
#include "graph.h"
#include <iostream>
#include <string>

class OrderManagement {
private:
    HashMap  orderMap;        
    MaxHeap  priorityQueue;   //highest priority first
    Graph&   deliveryGraph;
    int      nextOrderID;

    double computePriority(const Order& order) const;

public:
    OrderManagement(Graph& g);

    void addOrder   (int location, int urgency, double value, int deadline);
    void searchOrder(int orderID) const;
    void cancelOrder(int orderID);
    void processOrder();
    bool hasPendingOrders() const;
    void displayAllOrders() const;
};
