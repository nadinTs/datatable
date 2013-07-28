var DataTable = function (table, opts) {

	"use strict" ;

	this.options = opts ;
	this.table = table ;
	this.currentPage = 0 ; 
	this.currentStart = 0 ; // different from currentPage * pageSize because there is a filter
	this.filterIndex = [] ;
	
	this.filters = [] ;
	this.filterVals = [] ;
	
	this.table.addClass('data-table') ;
	
	/* If nb columns not specified, count the nunber of column from thead. */
	if (this.options.nbColumns < 0) {
		this.options.nbColumns = this.table.find('thead tr').first().find('th').length ;
	}
	
	/* Create the base for pagination. */
	$(this.options.pagingDivSelector)
		.addClass("pagination pagination-centered pagination-data-tables")
		.html('<ul></ul>') ;
	
	/* DATA ! */
	
	var dataTable = this ;
	
	if (jQuery.isArray(this.options.data)) {
		this.data = this.options.data ;
	}
	else if (jQuery.isPlainObject(this.options.data)) {
		var size = parseInt(this.table.data('size'), 10) ;	
		this.data = [] ;
		$(this.options.loadingDivSelector).html('<div class="progress progress-striped active datatable-load-bar"><div class="bar" style="width: 0%;"></div></div>') ;
		this.updateLoadingDivs = function () {
			if (this.data.length === size) {
				$(this.options.loadingDivSelector).remove() ;
			}
			else {
				$(this.options.loadingDivSelector).find('div.progress .bar').css('width', parseInt(100 * this.data.length / size, 10) + '%') ;
			}
		} ;
		this.getAjaxData = function (start) {
			$.ajax({
				url: this.options.data.url,
				type: this.options.data.type,
				data: {
					offset: start,
					limit: this.options.pageSize * this.options.pagingNumberOfPages 
				},
				ajaxI: start,
				ajaxThis: this,
				success: function (data, text, jqxhr) {
					this.ajaxThis.data = this.ajaxThis.data.concat($.parseJSON(data)) ;
					this.ajaxThis.sort() ;
					this.ajaxThis.filter () ;
					this.ajaxThis.updateLoadingDivs () ;
				},
				error: function (jqhxr, text, error) {
					console.log('Load ' + this.ajaxI + ' failed: ' + text + ' (Trying again)') ;
					this.ajaxThis.getAjaxData(this.ajaxI) ;
				}
			}) ;
		} ;
		for (var i=0 ; i < size; i += this.options.pageSize * this.options.pagingNumberOfPages ) {
			this.getAjaxData (i) ;
		}
	}
	else {
		this.data = [] ;
		this.table.find('tbody tr').each(function () {
			var line = [] ;
			$(this).find('td').each(function () { line.push($(this).text()) ; }) ;
			dataTable.data.push(line) ;
		}) ;
	}
	
	/* Some getters to help in the function below... */
	
	this.getTable = function () {
		return this.table ;
	} ;
	
	this.getHead = function () {
		return this.table.find('thead').first() ;
	} ;
	
	this.getBody = function () {
		return this.table.find('tbody').first() ;
	} ;
	
	this.getCounter = function () {
		return $(this.options.counterDivSelector) ;
	} ;
	
	this.getPagingLists = function () {
		return $(this.options.pagingDivSelector).find('ul') ;
	} ;
	
	/** Update the paging div. **/
	this.updatePaging = function () {
	
		/* Be carefull if you change something here, all this part calculate the first and last page to display.
		I choose to center the current page, it's more beautiful... */
	
		var nbPages = this.options.pagingNumberOfPages;
		var dataTable = this ;
		var cp = parseInt(this.currentStart / this.options.pageSize, 10) + 1;
		var lp = parseInt(Math.ceil(this.filterIndex.length / this.options.pageSize), 10);
		var start ;
		var end ;

		if (cp < nbPages/2) { 
			start = 1 ; 
		}
		else if (cp >= lp - nbPages/2) {
			start = lp - nbPages + 1 ;
			if (start < 1) {
				start = 1 ;
			}
		}
		else {
			start = parseInt(cp - nbPages/2 + 1, 10) ;
		}
		
		if (start + nbPages < lp + 1) {
			end = start + nbPages - 1;
		}
		else {
			end = lp ;
		}
		
		/* Juste iterate over each paging list and append li to ul. */
	
		this.getPagingLists().each (function () {
			$(this).html('') ;
			$(this).append('<li class="' + ((cp === 1) ? 'active' : '') + '"><a data-page="first">&lt;&lt;</a></li>') ;
			$(this).append('<li class="' + ((cp === 1) ? 'active' : '') + '"><a data-page="prev">&lt;</a></li>') ;
			for (var i = start ; i <= end ; i++) {
				$(this).append('<li class="' + ((i === cp) ? 'active' : '') + '"><a data-page="' + i + '">' + i + '</a></li>') ;
			}
			$(this).append('<li class="' + ((cp === lp || lp === 0) ? 'active' : '') + '"><a data-page="next">&gt;</a></li>') ;
			$(this).append('<li class="' + ((cp === lp || lp === 0) ? 'active' : '') + '"><a data-page="last">&gt;&gt;</a></li>') ;
			
		}) ;
		
		/* Add callback. */
		
		this.getPagingLists().find('a').click (function () {
			if ($(this).parent('li').hasClass('active')) {
				return ;
			}
			var page = $(this).data('page') ;
			switch (page) {
			case 'first':
				dataTable.loadPage(1) ;
				break ;
			case 'prev':
				dataTable.loadPage(cp - 1) ;
				break ;
			case 'next':
				dataTable.loadPage(cp + 1) ;
				break ;
			case 'last':
				dataTable.loadPage(lp) ;
				break ;
			default:
				dataTable.loadPage(parseInt(page, 10)) ;
			}
		}) ;
	
	} ;
	
	this.updateCounter = function () {
		var cp = this.filterIndex.length ? parseInt(this.currentStart / this.options.pageSize, 10) + 1 : 0 ;
		var lp = parseInt(Math.ceil(this.filterIndex.length / this.options.pageSize), 10);
		var first = this.filterIndex.length ? this.currentStart + 1 : 0 ;
		var last = (this.currentStart + this.options.pageSize) > this.filterIndex.length ? this.filterIndex.length : this.currentStart + this.options.pageSize ;
		this.getCounter().html(this.options.counterText(cp, lp, first, last, this.filterIndex.length)) ;
	} ;
	
	/** Return a sort function according options.sortKey & options.sortDir **/
	this.getSortFunction = function () {
		if (jQuery.isFunction(this.options.sort)) {
			return this.options.sort ;
		}
		var key = this.options.sortKey ;
		var asc = this.options.sortDir === 'asc';
		return function (a,b) {
			var vala = a[key], valb = b[key] ;
			if (vala > valb) { return asc ?  1 : -1 ; }
			if (vala < valb) { return asc ? -1 :  1 ; }
			return 0 ;
		} ;
	} ;
	
	/** Return the length of data after filtering. **/
	this.filter = function () {
		this.currentStart = 0 ;
		this.filterIndex = []  ;
		for (var i = 0 ; i < this.data.length ; i++) { 
			if (this.checkFilter(this.data[i])) { this.filterIndex.push(i) ; }
		}
		this.refresh () ;
	} ;
	
	this.checkFilter = function (data) {
		var ok = true ;
		for (var fk in this.filters) {
			if (!this.filters[fk](data[fk], this.filterVals[fk])) {
				ok = false ;
				break ;
			}
		}
		return ok ;
	} ;
	
	this.addFilter = function (field, filter) {
		this.filters[field] = filter ;
	} ;
	
	/** Sort the data (WITHOUT REFRESHING). **/
	this.sort = function () {
		if (!this.options.sort) {
			return ;
		}
		this.data.sort(this.getSortFunction()) ;
	} ;
	
	/** Add a 'row' (a data). **/
	this.addRow = function (data) {
		this.data.push(data) ; 
		this.sort() ;
		this.filter () ;
		this.currentStart = parseInt(this.filterIndex.indexOf(this.data.indexOf(data)) / this.options.pageSize, 10) * this.options.pageSize ;
		this.refresh () ;
	} ;
	
	/** Remove a 'row'. */
	this.deleteRow = function (rowId) {
		var oldCurrentStart = this.currentStart ;
		this.data.splice(rowId, 1) ;
		this.filterIndex.splice(this.filterIndex.indexOf(rowId), 1) ;
		this.filter () ;
		if (oldCurrentStart < this.filterIndex.length) {
			this.currentStart = oldCurrentStart ;
		}
		else {
			this.currentStart = oldCurrentStart - this.options.pageSize ;
			if (this.currentStart < 0) { this.currentStart = 0 ; }
		}
		this.refresh () ;
	} ;
	
	/** Update a 'row' (data). **/
	this.updateRow = function (rowId, data) {
		this.data.splice(rowId, 1);
		this.addRow(data) ;
	} ;
	
	/** Change the current page and refresh. **/
	this.loadPage = function (page) {
		this.currentStart = (page - 1) * this.options.pageSize  ;
		this.refresh () ;
	} ;
	
	/** Refresh the page according to current page (DO NOT SORT).
	This function call options.lineFormat. **/
	this.refresh = function () {
		this.options.beforeRefresh () ;
		this.updatePaging () ;
		this.updateCounter () ;
		this.getBody().html('') ;
		if (this.currentStart >= this.currentDataLength) {
			this.getBody().append('<tr><td colspan="' + this.options.nbColumns + '"><div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div></div></tr>') ;
			return ;
		}
		for (var i=0; i<this.options.pageSize && i+this.currentStart < this.filterIndex.length; i++) {
			this.getBody().append(this.options.lineFormat(this.filterIndex[this.currentStart+i], this.data[this.filterIndex[this.currentStart+i]])) ;
		}
		this.options.afterRefresh () ;
	} ;
	
	/* Add sorting class to all th and add callback. */
	
	if (!jQuery.isFunction(this.options.sort)) {
	
		var countTH = 0 ;
		
		this.getTable().find('thead th').each (function () {
		
			if ($(this).data('sort')) {
				dataTable.options.sort = true ;
			}
			else if (dataTable.options.sort === '*') {
				$(this).data('sort', countTH) ;
			}
			else if (jQuery.isArray(dataTable.options.sort) && dataTable.options.sort[countTH]) {
				$(this).data('sort', dataTable.options.sort[countTH]) ;
			}
			
			if ($(this).data('sort') !== undefined) {
				$(this).addClass('sorting')  ;
			}
			
			countTH ++ ;
		
		}) ;
		
		this.getTable().find('thead th').click(function () {
			if ($(this).data('sort') !== undefined) {
				if ($(this).hasClass('sorting-asc')) {
					dataTable.options.sortDir = 'desc' ;
					$(this).removeClass('sorting-asc')
						.addClass('sorting-desc') ;
				}
				else if ($(this).hasClass('sorting-desc')) {
					dataTable.options.sortDir = 'asc' ;
					$(this).removeClass('sorting-desc') 
						.addClass('sorting-asc') ;
				}
				else {
					$(this).parent('tr').find('th').removeClass('sorting-desc').removeClass('sorting-asc') ;
					dataTable.options.sortDir = 'asc' ;
					dataTable.options.sortKey = $(this).data('sort') ;
					$(this).addClass('sorting-asc') ;
				}
				dataTable.sort () ;
				dataTable.refresh () ;
			}
		}) ;
	
	}
	
	var typewatch = (function(){
		var timer = 0;
		return function(callback, ms){
			clearTimeout (timer);
			timer = setTimeout(callback, ms);
		};
	})();
	
	/* Add filter where it's needed. */
	
	if (this.options.filters) {
		var tr = $('<tr></tr>').insertAfter(this.getTable().find('thead tr').last()) ;
		for (var field in this.options.filters) {
			if (this.options.filters[field]) {
				var td = $('<td></td>') ;
				if (this.options.filters[field] === true) {
					var input = $('<input type="text" class="search-field" data-sort="' + field + '" />') ;
					dataTable.filterVals[field] = input.val() ;
					input.keyup(function (field) {
						return function () {
							var val = $(this).val().toUpperCase() ;
							typewatch (function () {
								// dataTable.options.filter = field ;
								dataTable.filterVals[field] = val ;
								dataTable.filter () ; 
							}, 300) ;
						} ;
					} (field)) ;
					td.append(input) ;
					dataTable.addFilter(field, function (data, val) {
						return data.toUpperCase().indexOf(val) !== -1;
					}) ;
				}
				else {
					var values = [], selected ;
					if ('values' in this.options.filters[field]) {
						values = this.options.filters[field]['values'] ;
						selected = this.options.filters[field]['default'];
					}
					else {
						values = this.options.filters[field] ;
						selected = values ;
					}
					var select = $('<select multiple="multiple" class="selectpicker" data-sort="' + field + '"></select>') ;
					for (var key in values) {
						select.append('<option value="' + key + '" ' + (key in selected ? 'selected' : '') + '>' + values[key] + '</option>') ;
					}
					dataTable.filterVals[field] = select.val() ;
					select.change (function (field) {
						return function () {
							var val = $(this).val() ;
							// dataTable.options.filter = field ;
							dataTable.filterVals[field] = val ;
							dataTable.filter () ;
						} ;
					} (field)) ;
					td.append(select) ;
					dataTable.addFilter(field, function (data, val) {
						if (!val) { return false ; }
						return val.indexOf(data) !== -1 ;
					}) ;
				}
				tr.append(td) ;
			}
			else {
				tr.append('<td></td>') ;
			}
		}
		if ($.isFunction($().selectpicker())) {
			$('.selectpicker').selectpicker() ;
		}
	}
	
	/* If a sort key is specified, sort. */
		
	if (jQuery.isFunction(this.options.sort)) {
		this.sort() ;
	}
	else if (this.options.sortKey !== undefined) {
		this.getTable().find('thead th[data-sort="' + this.options.sortKey + '"]').trigger('click') ;
	}
	
	/* Then filter (and refresh) ! */
	
	this.filter () ;
	
} ;

(function ($) {

	"use strict" ;
 
    $.fn.datatable = function(options) {
		var args = arguments ;
		return this.each(function () {
			if ($.isPlainObject(options)) {
				this.datatable = new DataTable($(this), $.extend({}, $.fn.datatable.defaults, options)) ;
			}
			else if (typeof options === 'string') {
				switch (options) {
				case 'insert':
					this.datatable.addRow(args[1]) ;
					break ;
				case 'update':
					this.datatable.updateRow(args[1], args[2]) ;
					break ;
				case 'delete':
					this.datatable.deleteRow(args[1]) ;
					break ;
				}
			}
		}) ;
    };
	
	$.fn.datatable.defaults = {
		pagingDivSelector: '.paging',
		counterDivSelector: '.counter',
		loadingDivSelector: '.loading',
		sort: false,
		sortKey: undefined,
		sortDir: 'asc',
		nbColumns: -1,
		pageSize: 20,
		pagingSize: 10,
		pagingNumberOfPages: 9,
		counterText: function (currentPage, totalPage, firstRow, lastRow, totalRow) {
			return 'Page ' + currentPage + '/' + totalPage + '. Entrée(s) ' + firstRow + ' à ' + lastRow + ' sur un total de ' + totalRow + '.' ;
		},
		filters: {},
		beforeRefresh: function () { },
		afterRefresh: function () { },
		lineFormat: function (id, data) { 
			var res = $('<tr></tr>') ;
			for (var key in data) { res.append('<td>' + data[key] + '</td>') ; }
			return res ;
		}
	} ;
 
} (jQuery)); 