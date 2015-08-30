'use strict';
	
/**
* @fileOverview
* @author Guido Donnari
*/

/**
* CRUD template for FlexyList angular module.
* @module
*/
var crudTable = angular.module('crudTable', [
	'flexiList',
	'gettext', 
	'ui.bootstrap',
	'treasure-overlay-spinner'
]);

crudTable.controller('crudTableCtrl', ['$scope', 'gettext', function($scope, gettext) {
	
	$scope.ct.busy = false;
	$scope.ct.page = 1;
	
	$scope.$on('flStartOp', function($e, $args)
	{
		$scope.ct.busy = true;
	});
	
	$scope.$on('flComplete', function($e, $args)
	{
		$scope.ct.busy = false;
	});
	
	$scope.ct.pageChanged = function() {
		$scope.list.changePage($scope.list.pagination_info.currpage);
	};
	
	$scope.ct.setSearch = function (field) {
		$scope.ct.search_field = field;
	};
	
	$scope.ct.colIsSortable = function (col) {
		if (col.sortable == false)	return false;
		return $scope.list.sortEnabled();
	};
	
	$scope.ct.search = function () {
		
		var v_where = [];
		
		if ($scope.ct.search_field && $scope.ct.search_value)
			v_where = [{
				field: $scope.ct.search_field.field, 
				condition: $scope.ct.search_field.condition, 
				value: $scope.ct.search_value,
				options: $scope.ct.search_field.options
			}];
		
		if ($scope.list.options.jsonFile)
			$scope.list.change({
				where: v_where
			});
		else
			$scope.list.loadData({
				where: v_where
			}, true);
	};
	
	$scope.ct.sort = function (e, sort_field, sort_type) {
		
		if ($scope.list.options.jsonFile)
			$scope.list.change({
				orderby: [{
					field: sort_field, 
					type: sort_type
				}]
			});
		else
			$scope.list.loadData({
				orderby: [{
					field: sort_field, 
					type: sort_type
				}]
			});
	};
	
	$scope.ct.getCheckedStr = function() {
		if ($scope.list.getToggleSelNextState())	return gettext('Uncheck all rows');
		return gettext('Check all rows');
	};
	
}])
.directive('crudTable', function() {
	return {
		restrict: 'E',
		scope: {
			list: '=',
			ct: '='
		},
		controller: 'crudTableCtrl',
		templateUrl: function(elem, attr){
			return attr.template;
		}
	};
})
.directive('flFieldDisplay', function() {
	return {
		restrict: 'E',
		link: function link(scope, element, attrs) {
			if (scope.ct.options.displayField)
				scope.ct.options.displayField(scope, element, attrs);
			else
				element.html(attrs['value']);
		}
	};
});