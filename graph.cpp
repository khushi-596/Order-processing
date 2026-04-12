#include "graph.h"
#include <iostream>
using namespace std;

MinHeap::MinHeap(int cap) : size(0), capacity(cap) {
    heap = new MinHeapNode[capacity];
}

MinHeap::~MinHeap() {
    delete[] heap;
}

//heapify up
void MinHeap::heapifyUp(int i) {
    while (i > 0 && heap[parent(i)].dist > heap[i].dist) {
        // swap
        MinHeapNode temp  = heap[i];
        heap[i]           = heap[parent(i)];
        heap[parent(i)]   = temp;
        i = parent(i);
    }
}

//heapify down
void MinHeap::heapifyDown(int i) {
    int smallest = i;
    int l = left(i);
    int r = right(i);

    //check left child
    if (l < size && heap[l].dist < heap[smallest].dist)
        smallest = l;
        
    //check right child
    if (r < size && heap[r].dist < heap[smallest].dist)
        smallest = r;
    
    //if child is smaller - swap
    if (smallest != i) {
        MinHeapNode temp  = heap[i];
        heap[i]           = heap[smallest];
        heap[smallest]    = temp;
        heapifyDown(smallest);
    }
}

//insert into heap
void MinHeap::insert(int dist, int vertex) {
    if (size >= capacity) return;   
    heap[size] = {dist, vertex};
    heapifyUp(size);
    size++;
}

//removes smallest distance node
MinHeapNode MinHeap::extractMin() {
    MinHeapNode min = heap[0];
    heap[0] = heap[size - 1];
    size--;
    if (size > 0)
        heapifyDown(0);
    return min;
}

//if heap is empty
bool MinHeap::isEmpty() const { return size == 0; }

Graph::Graph(int vertices) : V(vertices) {
    
    //adjacency list
    adj = new Node*[V];
    locationNames = new std::string[V];
    for (int i = 0; i < V; i++) {
        adj[i] = nullptr;
        locationNames[i] = "Location " + std::to_string(i);
    }
}

Graph::~Graph() {
    for (int i = 0; i < V; i++) {
        Node* curr = adj[i];
        while (curr != nullptr) {
            Node* temp = curr;
            curr = curr->next;
            delete temp;
        }
    }
    delete[] adj;
    delete[] locationNames;
}

void Graph::setLocation(int vertex, const std::string& name) {
    if (vertex >= 0 && vertex < V)
        locationNames[vertex] = name;
}

std::string Graph::getLocation(int vertex) const {
    if (vertex >= 0 && vertex < V)
        return locationNames[vertex];
    return "Unknown";
}

//display graph
void Graph::displayMap() const {
    cout << "\n=== Delivery Network Map ===\n";
    cout << "  Warehouse (Hub): " << locationNames[0] << "\n";
    cout << "  Delivery Zones:\n";
    for (int i = 1; i < V; i++) {
        cout << "    [" << i << "] " << locationNames[i];
        cout << "  →  ";
        
        //show connections
        for (Node* p = adj[i]; p != nullptr; p = p->next)
            cout << locationNames[p->dest] << " (" << p->weight << " min)  ";
        cout << "\n";
    }
    cout << "============================\n";
}

//add edge
void Graph::addEdge(int u, int v, int weight) {
    if (u < 0 || u >= V || v < 0 || v >= V) {
        cout << " Invalid edge! Vertices must be between 0 and " << V - 1 << ".\n";
        return;
    }
    if (weight < 0) {
        cout << " Invalid edge! Weight cannot be negative.\n";
        return;
    }
    // u to v
    Node* n1 = new Node{ v, weight, adj[u] };
    adj[u] = n1;
    // v to u
    Node* n2 = new Node{ u, weight, adj[v] };
    adj[v] = n2;
}

void Graph::dijkstra(int source, int dist[]) const {
    // Initialize dist[]
    for (int i = 0; i < V; i++)
        dist[i] = INF;
    dist[source] = 0;

    //visited array
    bool* visited = new bool[V];
    for (int i = 0; i < V; i++)
        visited[i] = false;

    //min heap
    MinHeap minHeap(V * V);
    minHeap.insert(0, source);

    while (!minHeap.isEmpty()) {
        MinHeapNode top = minHeap.extractMin();
        int u = top.vertex;

        if (visited[u]) continue;
        visited[u] = true;

        //check neighbors
        for (Node* p = adj[u]; p != nullptr; p = p->next) {
            int v = p->dest;
            int w = p->weight;
            if (!visited[v] && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                minHeap.insert(dist[v], v);
            }
        }
    }

    delete[] visited;
}

//number of vertices
int Graph::getVertices() const { return V; }
