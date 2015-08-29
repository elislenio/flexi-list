'use strict';
	
/**
* @fileOverview
* @author Guido Donnari
*/

/**
* THUMS template for FlexyList angular module.
* @module
*/
var thumbs = angular.module('thumbs', [
	'flexiList',
	'ui.bootstrap'
]);

thumbs.controller('thumbsCtrl', ['$scope', function($scope) {
	
	$scope.th.page = 1;
	
	$scope.th.pageChanged = function() {
		$scope.list.changePage($scope.list.pagination_info.currpage);
	};
	
	$scope.th.getThumbnailSrc = function(record) {
		return $scope.th.options.img_dir + record[$scope.th.options.img_field];
	};
	
	// Search
	$scope.th.search = function () {
		
		var v_where = [];
		
		if ($scope.th.options.search_field && $scope.th.search_value)
			v_where = [{
				field: $scope.th.options.search_field, 
				condition: $scope.th.options.search_condition, 
				value: $scope.th.search_value,
				option: $scope.th.options.search_condition_opt
			}];
		
		if ($scope.list.options.jsonFile)
			$scope.list.change({where: v_where});
		else
			$scope.list.loadData({where: v_where});
	};
	
}])
.directive('thumbs', function() {
	return {
		restrict: 'E',
		scope: {
			list: '=',
			th: '='
		},
		controller: 'thumbsCtrl',
		templateUrl: function(elem, attr){
			return attr.template;
		}
	};
});