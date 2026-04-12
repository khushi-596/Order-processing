#include "order.h"

struct HashEntry {
    int      key;        // orderID
    Order    value;      // full Order data
    HashEntry* next;    

    HashEntry(int k, const Order& v)
        : key(k), value(v), next(nullptr) {}
};

class HashMap {
private:
    static const int BUCKET_COUNT = 1009;  
    HashEntry* buckets[BUCKET_COUNT];
    int        count;                        

    int hash(int key) const;                 

public:
    HashMap();
    ~HashMap();

    void   insert(int key, const Order& value); 
    Order* search(int key) const;               
    bool   remove(int key);                    
    bool   contains(int key) const;             
    int    getCount() const;                    

    Order* getAll(int& outCount) const;

    bool hasPending() const;
};
