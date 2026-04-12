#ifndef ORDER_H
#define ORDER_H
#include <string>

struct Order {
    int    orderID;
    int    location;
    std::string locationName;
    int    urgency;
    double value;
    int    deadline;
    double priority;
    std::string status;

    Order() : orderID(0), location(0), locationName(""), urgency(0), value(0.0),
              deadline(0), priority(0.0), status("") {}
};

#endif
