import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, MessageCircle, Search } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-neutral-900">HouseHunt</h1>
          </div>
          
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-blue-600"
            data-testid="button-login"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-neutral-900 mb-6">
            Find Your Perfect Home
            <span className="text-primary block">Together</span>
          </h2>
          <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
            Collaborate with friends and family to search for apartments. Add locations, 
            share notes, and make decisions together with our interactive mapping platform.
          </p>
          
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-blue-600 px-8 py-4 text-lg"
            data-testid="button-get-started"
          >
            Start Your Search
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Mapping</h3>
              <p className="text-neutral-600">
                Add apartment locations directly on the map and visualize all your options in one place.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Collaborative Search</h3>
              <p className="text-neutral-600">
                Invite friends and family to help you search and make decisions together.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Discussion Threads</h3>
              <p className="text-neutral-600">
                Start conversations about each apartment and keep track of important details.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-neutral-900 mb-12">How It Works</h3>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h4 className="font-semibold mb-2">Sign In</h4>
              <p className="text-sm text-neutral-600">Create your account and get started</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h4 className="font-semibold mb-2">Add Apartments</h4>
              <p className="text-sm text-neutral-600">Mark locations on the map and add details</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h4 className="font-semibold mb-2">Collaborate</h4>
              <p className="text-sm text-neutral-600">Discuss each option with your team</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h4 className="font-semibold mb-2">Decide</h4>
              <p className="text-sm text-neutral-600">Make informed decisions together</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="bg-primary text-white p-8">
            <CardContent>
              <h3 className="text-2xl font-bold mb-4">Ready to Start Your Housing Search?</h3>
              <p className="text-blue-100 mb-6">
                Join thousands of users who have found their perfect home with HouseHunt.
              </p>
              <Button 
                variant="secondary"
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                className="bg-white text-primary hover:bg-neutral-100"
                data-testid="button-join-now"
              >
                Join Now - It's Free
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
