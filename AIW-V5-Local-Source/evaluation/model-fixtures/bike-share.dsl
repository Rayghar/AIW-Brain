// Neighbourhood bike share · Structurizr DSL fixture (AIW authored teaching example; no real organisation or product).
// Read by model-interpreter-validate.mjs and the model import browser suite. The brief it pairs with is the
// "Town bike share" brief in journey-drafter-validate.mjs.
workspace "Neighbourhood bike share" "Members unlock bikes at docks, ride, return and pay." {

  !identifiers hierarchical

  model {
    resident = person "Resident" "Signs up, unlocks a bike, rides and pays the fee."
    transport = person "Transport team" "Watches dock levels and asks the contractor to rebalance."
    contractor = person "Rebalancing contractor" "Moves bikes between docks each morning." "External"

    bikeshare = softwareSystem "Bike share platform" "Lets residents unlock, ride and pay for shared bikes." {
      app = container "Mobile app" "Shows docks with available bikes and unlocks a bike." "Mobile app"
      dockgateway = container "Dock gateway" "Talks to the dock hardware over the vendor protocol." "Protocol adapter" "Adapter"
      tripservice = container "Trip service" "Records each trip exactly once, from unlock to return." "Service"
      pricing = container "Pricing and payment service" "Calculates the fee and charges the saved payment method." "Service"
      console = container "Fleet console" "Shows the transport team full and empty docks and out-of-service bikes." "Web application"
      tripstore = container "Trip store" "Keeps trips, members and dock status." "Relational database" "Database"
      events = container "Trip events" "Carries unlock, return and charge events between services." "Message broker" "Queue"

      app -> tripservice "Asks for docks and unlocks a bike" "HTTPS"
      dockgateway -> tripservice "Reports unlock and return events" "Message"
      tripservice -> tripstore "Reads and writes trips" "SQL"
      tripservice -> events "Publishes trip completed" "Event"
      pricing -> events "Subscribes to trip completed" "Event"
      pricing -> tripstore "Reads the trip and writes the charge" "SQL"
      console -> tripstore "Reads dock status" "SQL"
    }

    dock = softwareSystem "Dock hardware" "The chosen dock speaks a vendor protocol over mobile data." "External"
    payment = softwareSystem "Payment provider" "The council's existing provider holds the tokenised card." "External"
    email = softwareSystem "Email service" "Sends the sign-up confirmation." "External"

    resident -> bikeshare.app "Finds a dock, unlocks a bike and sees receipts"
    transport -> bikeshare.console "Marks bikes out of service and reads dock levels"
    contractor -> bikeshare.console "Reads the morning rebalancing list"
    bikeshare.dockgateway -> dock "Releases the lock and reads dock status" "Vendor protocol"
    bikeshare.pricing -> payment "Charges the fee to the tokenised card" "HTTPS"
    bikeshare.tripservice -> email "Sends the sign-up confirmation" "SMTP"

    live = deploymentEnvironment "Live" {
      region = deploymentNode "Council cloud region" "The council's cloud region." "Cloud region" "" "1" {
        cluster = deploymentNode "Application cluster" "Runs the services." "Container platform" "" "2" {
          containerInstance bikeshare.tripservice
          containerInstance bikeshare.pricing
          containerInstance bikeshare.console
        }
        dbserver = deploymentNode "Database server" "Managed relational database." "Managed database" "" "1" {
          containerInstance bikeshare.tripstore
        }
        broker = deploymentNode "Message broker cluster" "" "Managed broker" "" "1" {
          containerInstance bikeshare.events
        }
      }
      edge = deploymentNode "Dock sites" "Docks on the street, each with mobile coverage." "Street cabinet" "" "40" {
        containerInstance bikeshare.dockgateway
      }
    }
  }

  views {
    systemContext bikeshare "context" "The bike share platform and the people and systems around it." {
      include *
      autoLayout
    }
    container bikeshare "containers" "The containers of the platform." {
      include *
      autoLayout
    }
    deployment bikeshare "Live" "live" "Where the containers run." {
      include *
      autoLayout
    }
    styles {
      element "External" {
        background #d9dfd8
      }
    }
  }

  configuration {
    scope softwaresystem
  }
}
