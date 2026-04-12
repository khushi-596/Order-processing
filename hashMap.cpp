#include "hashMap.h"
#include <iostream>
using namespace std;

int HashMap::hash(int key) const {
    int h = key % BUCKET_COUNT;
    if (h < 0) h += BUCKET_COUNT;
    return h;
}

//Constructor
HashMap::HashMap() : count(0) {
    for (int i = 0; i < BUCKET_COUNT; i++)
        buckets[i] = nullptr;
}

//Destructor
HashMap::~HashMap() {
    for (int i = 0; i < BUCKET_COUNT; i++) {
        HashEntry* curr = buckets[i];
        while (curr != nullptr) {
            HashEntry* temp = curr;
            curr = curr->next;
            delete temp;
        }
        buckets[i] = nullptr;
    }
}

//insert
void HashMap::insert(int key, const Order& value) {
    int idx = hash(key);

    // Check if key already exists - update
    HashEntry* curr = buckets[idx];
    while (curr != nullptr) {
        if (curr->key == key) {
            curr->value = value;    // update existing
            return;
        }
        curr = curr->next;
    }

    //insert new node at beginning
    HashEntry* newEntry = new HashEntry(key, value);
    newEntry->next  = buckets[idx];
    buckets[idx]    = newEntry;
    count++;
}

//search
Order* HashMap::search(int key) const {
    int idx = hash(key);
    HashEntry* curr = buckets[idx];
    while (curr != nullptr) {
        if (curr->key == key)
            return &curr->value;
        curr = curr->next;
    }
    return nullptr; //not found
}

//deletes entry with given key
bool HashMap::remove(int key) {
    int idx = hash(key);
    HashEntry* curr = buckets[idx];
    HashEntry* prev = nullptr;

    while (curr != nullptr) {
        if (curr->key == key) {
            if (prev == nullptr)
                buckets[idx] = curr->next;   
            else
                prev->next = curr->next;
            delete curr;
            count--;
            return true;
        }
        prev = curr;
        curr = curr->next;
    }
    return false; //not found
}

//contains (check if key exists)
bool HashMap::contains(int key) const {
    int idx = hash(key);
    HashEntry* curr = buckets[idx];
    while (curr != nullptr) {
        if (curr->key == key) return true;
        curr = curr->next;
    }
    return false;
}

//get count
int HashMap::getCount() const {
    return count;
}

//get all orders
Order* HashMap::getAll(int& outCount) const {
    outCount = count;
    if (count == 0) return nullptr;

    //array of orders
    Order* result = new Order[count];
    int idx = 0;

    for (int i = 0; i < BUCKET_COUNT; i++) {
        HashEntry* curr = buckets[i];
        while (curr != nullptr) {
            result[idx++] = curr->value;
            curr = curr->next;
        }
    }
    return result;
}

//check pending orders
bool HashMap::hasPending() const {
    for (int i = 0; i < BUCKET_COUNT; i++) {
        HashEntry* curr = buckets[i];
        while (curr != nullptr) {
            if (curr->value.status == "Pending")
                return true;
            curr = curr->next;
        }
    }
    return false;
}
