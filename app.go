package main

import "html/template"
import "log"
import "github.com/gorilla/mux"
import "net/http"

// Random ID creation.
import (
	"math/rand"
	"strconv"
)

// Number of 1-4 digit base-36 numbers.
const MAX_IDS = 1727604

var templates = template.Must(template.ParseFiles(
	"html/base.html",
	"html/index.html",
	"html/create.html",
	"html/server.html",
	"html/client.html"))

// IndexData contains the data to pass to the index.html template.
type IndexData struct {
	Id string
}

// IndexController displays the home page.
func IndexController(writer http.ResponseWriter, request *http.Request) {
	idNum := rand.Intn(MAX_IDS)
	id := strconv.FormatInt(int64(idNum), 36)
	err := templates.ExecuteTemplate(writer, "index.html", IndexData{id})
	if err != nil {
		log.Fatal("Failed to execute template: ", err)
	}
}

// JobCreationData contains the data to pass to the create.html template.
type JobCreationData struct {
	Id string
}

// JobCreationController displays the job creation page.
func JobCreationController(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	id := vars["id"]
	err := templates.ExecuteTemplate(writer, "create.html", JobCreationData{id})
	if err != nil {
		log.Fatal("Failed to execute template: ", err)
	}
}

// JobServerData contains the data to pass to the server.html template.
type JobServerData struct {
	Id          string
	MapperCode  string
	ReducerCode string
	DataUrl     string
}

// JobServerController displays the job server page.
func JobServerController(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	id := vars["id"]
	mapper := request.FormValue("mapper")
	reducer := request.FormValue("reducer")
	dataUrl := request.FormValue("dataurl")
	data := JobServerData{
		Id:          id,
		MapperCode:  mapper,
		ReducerCode: reducer,
		DataUrl:     dataUrl}
	err := templates.ExecuteTemplate(writer, "server.html", data)
	if err != nil {
		log.Fatal("Failed to execute template: ", err)
	}
}

// ClientData contains the data to pass to the client.html template.
type ClientData struct {
	Id string
}

// ClientController displays the job creation page.
func ClientController(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	id := vars["id"]
	err := templates.ExecuteTemplate(writer, "client.html", ClientData{id})
	if err != nil {
		log.Fatal("Failed to execute template: ", err)
	}
}

// main sets up the URL routes and launches the HTTP server.
func main() {
	router := mux.NewRouter()
	router.HandleFunc("/", IndexController)
	router.HandleFunc("/create/{id}", JobCreationController)
	router.HandleFunc("/server/{id}", JobServerController)
	router.HandleFunc("/job/{id}", ClientController)
	http.Handle("/", router)

	err := http.ListenAndServe(":5500", nil)
	if err != nil {
		log.Fatal("ListenAndServe failed: ", err)
	}
}
