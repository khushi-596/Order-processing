#include "orderManagement.h"
#include <iostream>
#include <climits>
using namespace std;

int main() {
    cout << "====================================================\n";
    cout << "  ONLINE ORDER PROCESSING & DELIVERY ROUTING SYSTEM \n";
    cout << "====================================================\n\n";

    // Build city graph — 6 vertices (0 = Warehouse, 1-5 = Delivery Zones)
    Graph cityGraph(6);

    cityGraph.setLocation(0, "Central Warehouse");
    cityGraph.setLocation(1, "Downtown");
    cityGraph.setLocation(2, "Westside Mall");
    cityGraph.setLocation(3, "North Park");
    cityGraph.setLocation(4, "East Heights");
    cityGraph.setLocation(5, "Southgate");

    // Road network with travel times in minutes
    cityGraph.addEdge(0, 1, 10);   // Warehouse -- Downtown
    cityGraph.addEdge(0, 2, 15);   // Warehouse -- Westside Mall
    cityGraph.addEdge(0, 3,  8);   // Warehouse -- North Park
    cityGraph.addEdge(1, 4, 12);   // Downtown  -- East Heights
    cityGraph.addEdge(2, 5, 20);   // Westside  -- Southgate
    cityGraph.addEdge(3, 4,  5);   // North Park -- East Heights
    cityGraph.addEdge(4, 5,  7);   // East Heights -- Southgate

    cityGraph.displayMap();

    OrderManagement system(cityGraph);

    int choice;
    do {
        cout << "\n───────────────────────────────\n";
        cout << "            MENU\n";
        cout << "───────────────────────────────\n";
        cout << "1. Add New Order\n";
        cout << "2. Search Order\n";
        cout << "3. Cancel Order\n";
        cout << "4. Process Next Highest Priority Order\n";
        cout << "5. Display All Orders\n";
        cout << "6. Show Delivery Map\n";
        cout << "7. Exit System\n";
        cout << "───────────────────────────────\n";
        cout << "Enter your choice (1-7): ";

        if (!(cin >> choice)) {
            cout << " Invalid input! Please enter a number.\n";
            cin.clear();
            cin.ignore(INT_MAX, '\n');
            choice = 0;
            continue;
        }

        switch (choice) {
            case 1: {
                int    loc, urg, dl;
                double val;
                cout << "\n Enter Order Details:\n";
                cout << "  Delivery Zones:\n";
                cout << "    1 = Downtown       2 = Westside Mall\n";
                cout << "    3 = North Park      4 = East Heights\n";
                cout << "    5 = Southgate\n";

                cout << " Delivery Zone (1-5)          : ";
                if (!(cin >> loc)) {
                    cout << " Invalid input!\n";
                    cin.clear(); cin.ignore(INT_MAX, '\n'); break;
                }
                cout << " Urgency (1-10)               : ";
                if (!(cin >> urg)) {
                    cout << " Invalid input!\n";
                    cin.clear(); cin.ignore(INT_MAX, '\n'); break;
                }
                cout << " Order Value (> 0)            : ";
                if (!(cin >> val)) {
                    cout << " Invalid input!\n";
                    cin.clear(); cin.ignore(INT_MAX, '\n'); break;
                }
                cout << " Deadline in minutes (> 0)    : ";
                if (!(cin >> dl)) {
                    cout << " Invalid input!\n";
                    cin.clear(); cin.ignore(INT_MAX, '\n'); break;
                }
                system.addOrder(loc, urg, val, dl);
                break;
            }

            case 2: {
                int id;
                cout << "\n Enter Order ID to search: ";
                if (!(cin >> id) || id <= 0) {
                    cout << " Invalid Order ID!\n";
                    cin.clear(); cin.ignore(INT_MAX, '\n'); break;
                }
                system.searchOrder(id);
                break;
            }

            case 3: {
                int id;
                cout << "\n Enter Order ID to cancel: ";
                if (!(cin >> id) || id <= 0) {
                    cout << " Invalid Order ID!\n";
                    cin.clear(); cin.ignore(INT_MAX, '\n'); break;
                }
                system.cancelOrder(id);
                break;
            }

            case 4:
                system.processOrder();
                break;

            case 5:
                system.displayAllOrders();
                break;

            case 6:
                cityGraph.displayMap();
                break;

            case 7:
                cout << "\n Exiting the System. Goodbye!\n";
                break;

            default:
                cout << " Invalid choice! Please enter 1-7.\n";
        }

    } while (choice != 7);

    return 0;
}
