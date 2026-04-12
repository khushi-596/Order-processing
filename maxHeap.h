#include "order.h"

const int MAX_HEAP_SIZE = 1000;

class MaxHeap {
    Order heap[MAX_HEAP_SIZE + 1];  
    int   size;

    int parent(int i) const { return i / 2; }
    int left  (int i) const { return 2 * i; }
    int right (int i) const { return 2 * i + 1; }

    void heapifyUp  (int index);
    void heapifyDown(int index);

public:
    MaxHeap();
    void  insertHeap(const Order& order);
    Order extractMax();
    bool  isEmpty() const;
    int   getSize() const;
};
