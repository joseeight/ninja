/*
 * Collapser:  Takes two elements and creates a visual "expando:" clicking on one element expands/collapses the other.
 * Required properties:
 * 		clicker: The element that will be clicked on.
 * 		content: The element that will expand or collapse as the clicker is clicked on.
 * Optional properties:
 * 		isCollapsed: Is the content collapsed.  Set to true on serialization (or initialization) to start content in collapsed state.
 * 			Can be manually set as well.
 * 		collapsibleClass: The CSS class to apply to the content and the clicker when collapsed.  Defaults to "collapsible-collapsed".
 * 		isAnimated: Set to true to apply a transition to expand/collapse (defaults to false).
 * 		transitionClass: If isAnimated is set to true, the component will apply transitionClass to the content during the 
 * 			collapse process.  You can then define transitionClass in your style sheet with the desired CSS transitions.
 * 			Defaults to "collapsible-transition".
 * 		contentHeight: If both isAnimated and isCollapsedAtStart are set to true, set contentHeight to the height of the content 
 * 			(in pixels, but without the "px") when not collapsed.  If this value is not set, the first time the content is expanded 
 * 			the transition will not work. Subsequent collapses (and expansions) will transition as expected.
 * 		isLabelClickable: Boolean that indicates whether or not the clicker should have listener events. Defaults to true; set to 
 * 			false for collapsers that will only be operated remotely.
 * 		toggle(): Manually toggle the expand/collapse of the content.
 * 		
 */
var Montage = require("montage/core/core").Montage,
	Component = require("montage/ui/component").Component,
	Collapser = exports.Collapser = Montage.create(Component, {

	// This component has no template.
	hasTemplate:{
		value: false
	},
	
	/* === BEGIN: Models === */
	
	// contentHeight: Stores the height of the content just before collapse.
	_contentHeight: {
		value: 0
	},
	contentHeight: {
		get: function() {
			return this._contentHeight;
		},
		set: function(newVal) {
			this._contentHeight = newVal;
		}
	},
	
	// isCollapsing: true if the collapser is collapsing (or expanding); used in the draw cycle.
	_isCollapsing: {
		value: false
	},
	
	// isAnimated: boolean to apply transition to expand/collapse 
	_isAnimated : {
		value: false
	},
	isAnimated: {
		get: function() {
			return this._isAnimated;
		},
		set: function(newVal) {
			this._isAnimated = newVal;
		}
	},
	
	_bypassAnimation : {
		value: false
	},
	bypassAnimation: {
		get: function() {
			return this._bypassAnimation;
		},
		set: function(newVal) {
			this._bypassAnimation= newVal;
		}
	},
	
	// transitionClass: The CSS class to apply to the content during collapse to provide CSS transition.
	// Note that this CSS class must be defined in your style sheet with the desired transitions.
	_transitionClass : {
		value: "collapsible-transition"
	},
	transitionClass: {
		get: function() {
			return this._transitionClass;
		},
		set: function(newVal) {
			this._transitionClass = newVal;
		}
	},
	
	// isCollapsed: is the content actually collapsed at this moment
	_isCollapsed: {
		value: ""
	},
	isCollapsed : {
		get: function() {
			return this._isCollapsed;
		},
		set: function(newVal) {
			if (newVal !== this._isCollapsed) {
				this._isCollapsed = newVal;
				this.needsDraw = true;
			}
			
		}
	},
	
	// collapsedClass:  the class to apply to the clicker and content when the content is collapsed.
	_collapsedClass : {
		value: "collapsible-collapsed"
	},
	collapsedClass: {
		get: function() {
			return this._collapsedClass;
		},
		set: function(newVal) {
			this._collapsedClass = newVal;
		}
	},
	
	// _origOverflowValue: Stores the original overflow value of the collapsible element.
	// Why store the value? While the collapsible element is collapsed, obviously we will need overflow: hidden.
	// But when the collapsible element is open, we will need overflow to return to its original value.
	_origOverflowValue : {
		value: false
	},
	
	// isLabelClickable: Boolean for whether or not the label is clickable. If set to false,
	// the label click listener is never applied.  For collapsibles that will only be operated remotely.
	// Defaults to true.
	_isLabelClickable : {
		value: true
	},
	isLabelClickable : {
		get: function() {
			return this._isLabelClickable;
		},
		set: function(newVal) {
			this._isLabelClickable = newVal;
		}
	},
	
	// labelClickEvent: an event to fire when the label is clicked.
	_labelClickEvent: {
		value: false
	},
	labelClickEvent: {
		get: function() {
			return this._labelClickEvent;
		},
		set: function(newVal) {
			this._labelClickEvent = newVal;
		}
	},
	
	// toggle: manually toggle the collapser.
	toggle: {
		value: function() {
			if (this.bypassAnimation) {
				this.isAnimated = false;
			}
			this.myContent.classList.remove(this.transitionClass);
			this.handleCollapserLabelClick();
		}
	},
	
	/* === END: Models === */
	
	/* === BEGIN: Draw cycle === */
	
	prepareForDraw: {
		value: function() {
			// Add a click listener to the label for expand/collapse
			if (this.isLabelClickable) {
				this.clicker.identifier = "collapserLabel";
				this.clicker.addEventListener("click", this, false);
			}

			// Get the original value of the overflow property:
			this._origOverflowValue = window.getComputedStyle(this.myContent, null).getPropertyValue("overflow");
			
			// If the content area is supposed to start out collapsed:
			if (this.isCollapsed) {
				this.myContent.style.height = "0px";
				// Set the overflow to hidden if it's not already
				if (this._origOverflowValue !== "hidden") {
					this.myContent.style.overflow = "hidden";
				}
				this.myContent.classList.add(this.collapsedClass);
				this.clicker.classList.add(this.collapsedClass);
			} else {
				this.myContent.style.height = "auto";
				this.myContent.classList.remove(this.collapsedClass);
				this.clicker.classList.remove(this.collapsedClass);
			}
		}
	},
	draw: {
		value: function() {
			// Is the content area expanding/collapsing?	
			this.myContent.classList.remove(this.transitionClass);	
			if (this._isCollapsing) {
				
				if (this.isAnimated) {
					// Apply the transition class to the content.
					this.myContent.classList.add(this.transitionClass);
					
					// Add a handler for the end of the transition, so we can tidy things up after
					// the transition completes
                    this.myContent.identifier = "myContent";
					this.myContent.addEventListener("webkitTransitionEnd", this, false);	
					
					this.myContent.style.overflow = "hidden";
				}

				// Next, are we expanding or collapsing?
				if (this.myContent.classList.contains(this.collapsedClass)) {
					// It's already collapsed so we are expanding
					this.myContent.style.height = this.contentHeight + "px";
					this.isCollapsed = false;
					
				} else {
					// It's expanded so we are collapsing
					this.myContent.style.height = "0px";
					this.isCollapsed = true;
					
					// Set the overflow to hidden if it isn't already
					if (this._origOverflowValue !== "hidden") {
						this.myContent.style.overflow = "hidden";
					}
				}
				
				// Toggle the CSS class and deactivate the collapsing flag because we are now done.
				this.myContent.classList.toggle(this.collapsedClass);
				this.clicker.classList.toggle(this.collapsedClass);
				this._isCollapsing = false;
				
				// Special cases:  If transition does not happen (in the case of a contentHeight of 0 
				// or isAnimated = false) we need to manually fire it here to do the cleanup.
				if ((this.contentHeight < 3) || (!this.isAnimated)) {
					this.handleMyContentWebkitTransitionEnd();
				}
			}
		}
	},
	
	/* === END: Draw cycle === */
	
	/* === BEGIN: Event handlers === */
	
	// Handle a click on the label
	handleCollapserLabelClick: {
		value: function() {

			// The user has clicked on one of the expandos.  What should we do?
			// First, are we expanding or collapsing?
			if (!this.myContent.classList.contains(this.collapsedClass)) {
				// We are collapsing!
				// Save the current height of the content.
				this.contentHeight = this.myContent.offsetHeight;
				// Set the current height of the content to a pixel height instead of "auto"
				// so that the transition can happen.
				// (This doesn't actually change the appearance of the element, 
				// so it's okay to do here, outside the draw cycle.)
				this.myContent.style.height = this.contentHeight + "px";
				
				this.isCollapsed = true;
			} else {
				this.isCollapsed = false;
			}
			
			// Set the collapsing flag so when the draw cycle begins 
			// it will know to expand/collapse.
			this._isCollapsing = true;
			
			// Set the component to run its draw cycle.
			this.needsDraw = true;
			
			// Dispatch my labelClick event
			if (this.labelClickEvent) {
				this.labelClickEvent(this.bypassAnimation);
			}

		}
	},
	
	// This handler is bound to the transitionEnd event.  If transitions
	// are disabled, it is called manually.
    handleMyContentWebkitTransitionEnd: {
		value: function(event) {
			
			// Are we animating the transitions?
			if (this.isAnimated) {
				// Yes, transitions are animated.
				// Remove the event listener so it won't fire again.
				this.myContent.removeEventListener("webkitTransitionEnd", this, false);
				
				// remove the CSS class that supplies the transition
				this.myContent.classList.remove(this.transitionClass);
			}
			
			// Set the height of the content area to auto; this way it can expand/collapse as interactions
			// happen within.
			if (!this.myContent.classList.contains(this.collapsedClass)) {
				this.myContent.style.height = "auto";
				// Return the overflow to its original value if it wasn't hidden
				if (this._origOverflowValue !== "hidden") {
					this.myContent.style.overflow = this._origOverflowValue;
				}
				
			}
			
			if (this.bypassAnimation) {
				this.bypassAnimation = false;
				this.isAnimated = true;
			}
		}
	}
	
	/* === END: Event handlers === */
});