#include "maxHeap.h"
#include <iostream>
using namespace std;

MaxHeap::MaxHeap() : size(0) {}

//Heapify up
void MaxHeap::heapifyUp(int index) {
    while (index > 1 && heap[parent(index)].priority < heap[index].priority) {
        Order temp          = heap[index];
        heap[index]         = heap[parent(index)];
        heap[parent(index)] = temp;
        index = parent(index);
    }
}

//heapify down (used after deletion)
void MaxHeap::heapifyDown(int index) {
    int largest = index;
    int l = left(index);
    int r = right(index);

    //check left child
    if (l <= size && heap[l].priority > heap[largest].priority)
        largest = l;
    
    //check right child
    if (r <= size && heap[r].priority > heap[largest].priority)
        largest = r;

    //if child is larger - swap
    if (largest != index) {
        Order temp      = heap[index];
        heap[index]     = heap[largest];
        heap[largest]   = temp;
        heapifyDown(largest);
    }
}

//insert
void MaxHeap::insertHeap(const Order& order) {
    if (size >= MAX_HEAP_SIZE) {
        cout << " Heap is full! Cannot add more orders.\n";
        return;
    }
    heap[++size] = order;
    heapifyUp(size);
}

Order MaxHeap::extractMax() {
    if (size == 0) {
        return Order();   // returns default empty order (orderID = 0)
    }
    Order maxOrder  = heap[1];
    heap[1]         = heap[size];
    size--;
    if (size > 0)
        heapifyDown(1);
    return maxOrder;
}

bool MaxHeap::isEmpty() const { return size == 0; }
int  MaxHeap::getSize()  const { return size; }
