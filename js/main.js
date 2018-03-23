/**
 * @author Jakub Czaja <jakoob89@gmail.com>
 **/

function initMap () {
  $(function () {
    // Declare initial variables and set map options
    var input = document.getElementById('pac-input')
    var chargerIcon
    var userLocation
    var markerCluster
    var gmarkers = []
    var options = {
      zoom: 6,
      center: {lat: 54.786703, lng: -4.097868},
      minZoom: 5,
      maxZoom: 18,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM
      }
    }

    // Initialize new map
    var map = new google.maps.Map(document.getElementById('map'), options)

    // Place custom controls inside the map
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(document.getElementById('userLocation'))
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input)
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(document.getElementById('filters'))

    // Geocoding - location search input field
    var autocomplete = new google.maps.places.Autocomplete(input, {placeIdOnly: true})
    var infowindow = new google.maps.InfoWindow()
    var infowindowContent = document.getElementById('infowindow-content')
    var geocoder = new google.maps.Geocoder()
    var marker = new google.maps.Marker({
      map: map,
      icon: {
        url: 'images/markers/search.png',
        scaledSize: new google.maps.Size(40, 40)
      }
    })
    autocomplete.bindTo('bounds', map)
    infowindow.setContent(infowindowContent)
    autocomplete.addListener('place_changed', function () {
      infowindow.close()
      var place = autocomplete.getPlace()
      if (!place.place_id) {
        return
      }
      geocoder.geocode({'placeId': place.place_id}, function (results, status) {
        if (status !== 'OK') {
          window.alert('Geocoder failed due to: ' + status)
          return
        }
        map.setZoom(13)
        map.setCenter(results[0].geometry.location)
        // Set the position of the marker using the place ID and location.
        marker.setPlace({
          placeId: place.place_id,
          location: results[0].geometry.location
        })
        marker.setVisible(true)
        infowindowContent.children['place-name'].textContent = place.name
        infowindowContent.children['place-address'].textContent = results[0].formatted_address
        infowindow.open(map, marker)
      })
    }) // End bracket // Geocoding

    // Geolocation
    $('#userLocation').click(function () {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          addUserMarker({
            coords: {
              lat: userLocation.lat,
              lng: userLocation.lng
            }
          })
          function addUserMarker (props) {
            var marker = new google.maps.Marker({
              position: props.coords,
              map: map,
              icon: {
                url: 'images/markers/user.png',
                scaledSize: new google.maps.Size(40, 40)
              }
            })
          }
          map.setCenter(userLocation)
          map.setZoom(13)
        }, function () {
          handleLocationError(true, infowindow, map.getCenter())
        })
      } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infowindow, map.getCenter())
      }
      function handleLocationError (browserHasGeolocation, infowindow, userLocation) {
        infowindow.setPosition(userLocation)
        infowindow.setContent(browserHasGeolocation ? 'Error: The Geolocation service failed.' : 'Error: Your browser doesn\'t support geolocation.')
        infowindow.open(map)
      }
    }) // End bracket // Geolocation

    // Listens to change on filter form, assigns the id of clicked option to a variable and runs filtering function
    $('input:radio').on('change', function () {
      var checked = this.id
      filterMarkers(checked)
    }) // End bracket // Filter function

    // Filter function
    function filterMarkers (checked) {
      var show
      var connArr
      var gmarkersArr
      // Loops through all the markers
      for (var i = 0; i < gmarkers.length; i++) {
        gmarkersArr = gmarkers[i]
        connArr = gmarkers[i].connectors
        // Loops through all the connectors in each marker
        // Checks which option is checked and assigns boolean to appropriate options
        // Sets visibility of the markers on the map based on previous logic
        for (var x = 0; x < connArr.length; x++) {
          if (connArr[x].ConnectorType !== checked) {
            show = false
          } gmarkersArr.setVisible(show)
        }
        for (var y = 0; y < connArr.length; y++) {
          if (connArr[y].ConnectorType === checked) {
            show = true
          } gmarkersArr.setVisible(show)
        }
        if (checked === 'all') {
          show = true
        } gmarkersArr.setVisible(show)
      }
      // Refreshes marker cluster to properly show icons
      markerCluster.repaint()
    }

    // Uses the XMLHttpRequest to get data from JSON file
    var xmlhttp = new XMLHttpRequest()
    // Calls a function when the readyState property changes
    xmlhttp.onreadystatechange = function () {
      // Check if JSON file ready and loaded without errors
      if (this.readyState === 4 && this.status === 200) {
        // Parse recieved JSON file
        var dataset = JSON.parse(this.responseText)
        // Loop through all charging devices
        for (var i = 0; i < dataset.ChargeDevice.length; i++) {
          // Filters devices that are free from access restrictions and do not require subscription
          if (
            dataset.ChargeDevice[i].SubscriptionRequiredFlag !== true &&
            dataset.ChargeDevice[i].AccessRestrictionFlag !== true &&
            dataset.ChargeDevice[i].PhysicalRestrictionFlag !== true
          ) {
            // Declares markers and their properties for each iteration
            addMarker({
              coords: {
                lat: Number(dataset.ChargeDevice[i].ChargeDeviceLocation.Latitude),
                lng: Number(dataset.ChargeDevice[i].ChargeDeviceLocation.Longitude)
              },
              connector: dataset.ChargeDevice[i].Connector,
              connectorType: dataset.ChargeDevice[i].Connector.ConnectorType,
              paymentDetails: dataset.ChargeDevice[i].PaymentDetails,
              content: dataset.ChargeDevice[i].ChargeDeviceName,
              allDayAcces: dataset.ChargeDevice[i].Accessible24Hours,
              paymentRequiredFlag: dataset.ChargeDevice[i].PaymentRequiredFlag,
              address: dataset.ChargeDevice[i].ChargeDeviceLocation.Address,
              locationLongDescription: dataset.ChargeDevice[i].ChargeDeviceLocation.LocationLongDescription
            })
          }
        } // End bracket // For loop
      } // End bracket // If statement - status

      // Creates markers on the map
      function addMarker (props) {
        if (props.allDayAcces) {
          chargerIcon = 'images/markers/charger24.png'
        } else {
          chargerIcon = 'images/markers/charger.png'
        }
        // Adds random ~100m ofset to coordinates to aviod markers appearing at exact same location
        var newLat = props.coords.lat + (Math.random() - 0.5) / 1500
        var newLng = props.coords.lng + (Math.random() - 0.5) / 1500
        // Set markers and its options
        var marker = new google.maps.Marker({
          position: new google.maps.LatLng(newLat, newLng),
          map: map,
          title: props.content,
          connectors: props.connector,
          icon: {
            url: chargerIcon,
            scaledSize: new google.maps.Size(40, 40)
          }
        })
        gmarkers.push(marker)

        // Listens to click on the markers, opens details window
        marker.addListener('click', function () {
          infoWindow.open(map, marker)
        })
        // Create details window
        if (props.content) {
          // Declaring variables
          var allDayAccess = ''
          var locationLongDescription = ''
          var postCode = ''
          var postTown = ''
          var buildingName = ''
          var buildingNumber = ''
          var thoroughfare = ''
          var street = ''
          var paymentDetails = ''
          var connectorType = ''
          var navLat = props.coords.lat
          var navLng = props.coords.lng

          // Constructing address from JSON
          // Checks if the postcode exists and displays the data from address object
          if (props.address.PostCode) {
            postCode = props.address.PostCode
            if (props.address.PostTown) {
              postTown = props.address.PostTown + '<br>'
            }
            if (props.address.BuildingName) {
              buildingName = props.address.BuildingName + '<br>'
            }
            if (props.address.BuildingNumber) {
              buildingNumber = props.address.BuildingNumber + ' '
            }
            if (props.address.Street === props.address.Thoroughfare) {
              if (props.address.Street) {
                street = props.address.Street + '<br>'
              }
            } else {
              if (props.address.Thoroughfare) {
                thoroughfare = props.address.Thoroughfare + '<br>'
              }
              if (props.address.Street) {
                street = props.address.Street + '<br>'
              }
            }
            // If there is not enough data in the address object, outputs LocationLongDescription
          } else if (props.locationLongDescription) {
            locationLongDescription = props.locationLongDescription
          }

          // Checks if the charger is accessible 24hours a day
          if (props.allDayAcces) {
            allDayAccess = "<button class='btn btn-sm btn-info allDayBtn' disabled><i class='fas fa-check'></i> 24 hour access</button><br>"
          } else {
            allDayAccess = "<button class='btn btn-sm btn-info allDayBtn' disabled><i class='fas fa-ban'></i> No 24 hour access</button><br>"
          }

          // Checks if the location requires payment and builds payment details button
          if (props.paymentRequiredFlag === true && props.paymentDetails != null) {
            paymentDetails = "<button data-toggle='collapse' data-target='#paymentDiv" + [i] + "' class='btn btn-sm btn-info'><i class='fas fa-money-bill-alt'></i> Payment Details</button><div id='paymentDiv" + [i] + "' class='collapse'>" + props.paymentDetails + '</div><br>'
          }
          // Loops through connectors and assigning their types to a variable
          for (var x = 0; x < props.connector.length; x++) {
            connectorType += 'Connector ' + [x + 1] + ': ' + props.connector[x].ConnectorType + '<br>'
          }

          // Build charger information window
          var infoWindow = new google.maps.InfoWindow({
            content: '<h6>' + props.content + '</h6>' +
            "<a href='https://www.google.com/maps/dir/?api=1&destination=" + navLat + ' ' + navLng + "&travelmode=driving' target='blank'><button class='btn btn-sm btn-info'><i class='fas fa-location-arrow'></i> Navigate</button></a>" +
            "<button data-toggle='collapse' data-target='#addressDiv" + [i] + "' class='btn btn-sm btn-info'><i class='fas fa-map-signs'></i> Show Address</button><div id='addressDiv" + [i] + "' class='collapse'>" +
            locationLongDescription +
            buildingName +
            buildingNumber +
            street +
            thoroughfare +
            postTown +
            postCode +
            '</div>' +
            "<br><button data-toggle='collapse' data-target='#connectorsDiv" + [i] + "' class='btn btn-sm btn-info'><i class='fas fa-plug'></i> Show Connector Types</button><div id='connectorsDiv" + [i] + "' class='collapse'>" +
            connectorType +
            '</div><br>' +
            allDayAccess +
            paymentDetails
          })
        } // End bracket // If statement - create details window
      } // End bracket // addMarker function

      // Sets options and adds marker clusters
      var mcOptions = {
        imagePath: 'images/markers/m',
        zoomOnClick: true,
        maxZoom: 11
      }
      markerCluster = new MarkerClusterer(map, gmarkers, mcOptions)
      markerCluster.setIgnoreHidden(true)
    } // End bracket // XMLHttpRequest
    // Initializes request and specifies the method than sens the request
    xmlhttp.open('GET', 'data/dataset.json', true)
    xmlhttp.send()
  })  // End bracket // jQuery
}  // End bracket // initMap
