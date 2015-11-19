INST_LIB_PATH:=usr/lib
INST_BIN_PATH:=bin
PKG_NAME:=kappaio-lighting-widget
PKG_RELEASE:=1.01

INSTALLATION_DIR:=/usr/lib/rsserial/$(PKG_NAME)

WIDGET_ROOT:=$(INSTALLATION_DIR)
WIDGET_INDEX:=hue_widget.html



PKG_BUILD_DIR := $(BUILD_DIR)/$(PKG_NAME)/src
include $(INCLUDE_DIR)/package.mk
define Package/$(PKG_NAME)/description
	core
endef

define Package/$(PKG_NAME)
	SECTION:=utils
	CATEGORY:=Utilities
	TITLE:=$(PKG_NAME) -- 802.15.4 control interface
	DEPENDS:=+kapparock-philips-hue +dimmible-light-restful +appdata +luci-kapparock-mod
	Maintainer:=Yuming Liang
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) -r ./src/* $(PKG_BUILD_DIR)/
endef

# We do not need to define Build/Configure or Build/Compile directives
# The defaults are appropriate for compiling a simple program such as this one

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)$(INSTALLATION_DIR)
	$(CP) -r ./files/webapp/* $(1)$(INSTALLATION_DIR)
	$(INSTALL_DIR) $(1)/tmp
	$(CP) -r ./files/register $(1)/tmp
endef

define Build/Compile
	$(call Build/Compile/Default,processor_family=$(_processor_family_))
endef

define Package/$(PKG_NAME)/preinst
#!/bin/sh
# check if we are on real system
$(info $(Profile))
if [ -z "$${IPKG_INSTROOT}" ]; then
	echo "preinstallation..., installation_dir is $(INSTALLATION_DIR)"
fi
exit 0
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
# check if we are on real system
$(info $(Profile))
if [ -z "$${IPKG_INSTROOT}" ]; then
	rm -rf /tmp/luci-modulecache/ /tmp/luci-indexcache /tmp/luci-sessions/
	echo "$(PKG_NAME)\" \"$(WIDGET_ROOT)\" \"$(WIDGET_INDEX)\" \"POST"
	/usr/lib/rsserial/widget_registry_mgr "$(PKG_NAME)" "$(WIDGET_ROOT)" "$(WIDGET_INDEX)" "POST"
fi
exit 0
endef
define Package/$(PKG_NAME)/postrm
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	rm -rf $(INSTALLATION_DIR)
	/usr/lib/rsserial/widget_registry_mgr "$(PKG_NAME)" "$(WIDGET_ROOT)" "$(WIDGET_INDEX)" "DELETE"
fi
exit 0
endef
define Package/$(PKG_NAME)/UploadAndInstall
ifeq ($(OPENWRT_BUILD),1)
compile: $(STAGING_DIR_ROOT)/stamp/.$(PKG_NAME)_installed
	$(SCP) $$(PACKAGE_DIR)/$$(PKG_NAME)_$$(VERSION)_$$(ARCH_PACKAGES).ipk $(1):/tmp
	$(SSH) $(1) opkg remove $(PKG_NAME)
	$(SSH) $(1) opkg install /tmp/$(PKG_NAME)_$$(VERSION)_$$(ARCH_PACKAGES).ipk
	$(SSH) $(1) rm /tmp/$$(PKG_NAME)_$$(VERSION)_$$(ARCH_PACKAGES).ipk
	$(SSH) $(1) rm /tmp/register
endif
ifeq ($(RASPBERRYPI_BUILD),1)
compile:$(STAMP_INSTALLED)
	@echo "---------------------------------------------------"
	@echo "**************** RASPBERRYPI_BUILD ****************"
	@echo "---------------------------------------------------"
	$(SCP) $$(PACKAGE_DIR)/$$(PACKAGE_BIN_DPKG) $(1):/tmp
	$(SSH) $(1) dpkg -i /tmp/$$(PACKAGE_BIN_DPKG)
endif
endef
UPLOAD_PATH:=$(or $(PKG_DST), $($(PKG_NAME)_DST))
$(if $(UPLOAD_PATH), $(eval $(call Package/$(PKG_NAME)/UploadAndInstall, $(UPLOAD_PATH))))

$(eval $(call BuildPackage,$(PKG_NAME)))

