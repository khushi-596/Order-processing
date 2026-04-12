const int INF = 2147483647 / 2;    // = 1,073,741,823
#include <string>

//Edge node for Adjacency List 
struct Node {
    int   dest;
    int   weight;
    Node* next;
};

struct MinHeapNode {
    int dist;
    int vertex;
};

class MinHeap {
    MinHeapNode* heap;   
    int          size;
    int          capacity;

    int  parent(int i) const { return (i - 1) / 2; }
    int  left  (int i) const { return 2 * i + 1;   }
    int  right (int i) const { return 2 * i + 2;   }

    void heapifyUp  (int i);
    void heapifyDown(int i);

public:
    MinHeap(int cap);
    ~MinHeap();

    void        insert    (int dist, int vertex);
    MinHeapNode extractMin();
    bool        isEmpty   () const;
};

class Graph {
private:
    int    V;       
    Node** adj;
    std::string* locationNames;

public:
    Graph(int vertices);
    ~Graph();

    void        addEdge      (int u, int v, int weight);
    void        dijkstra     (int source, int dist[]) const;  
    int         getVertices  () const;
    void        setLocation  (int vertex, const std::string& name);
    std::string getLocation  (int vertex) const;
    void        displayMap   () const;
};
